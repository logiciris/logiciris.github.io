---
title: "iOS 탈옥 탐지 우회"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Anti-Tampering]
tags: [ios, jailbreak-detection, frida, bypass]
description: "탈옥 흔적 파일·Cydia URL 스킴·쓰기/읽기 권한 검사로 탈옥을 판별하는 iOS 탐지 로직의 생김새와, 탐지 함수를 후킹해 뒤집는 우회를 정리합니다."
mermaid: true
---

> iOS 탈옥 탐지는 탈옥 단말에서만 보이는 흔적(파일·스킴·권한)을 모아 판별한 뒤 앱을 종료하거나 `ptrace`를 끈다. 신호가 정형적이라, 탐지 함수를 후킹해 "탈옥 아님"으로 반환시키면 통과한다.

## 개념

전형적인 탈옥 판별 신호:

- **흔적 파일/경로 존재**: `/Applications/Cydia.app`, `/bin/bash`, `/usr/sbin/sshd`, `/etc/apt`, `/private/var/lib/cydia`, `/usr/sbin/frida-server` 등을 `FileManager.fileExists`로 확인.
- **Cydia URL 스킴**: `cydia://`를 `canOpenURL`로 열 수 있는지.
- **샌드박스 밖 쓰기 권한**: `/private/<UUID>`에 테스트 파일 쓰기가 성공하는지(탈옥 단말은 성공).
- **읽기 권한**: `/bin/bash`를 `fopen("r")`로 열 수 있는지.

이 신호들을 모은 함수(`isJailbroken()`, `doDetectOS()`)가 결론을 내며, 탐지 시 `disablePtrace()`로 디버깅까지 막는 구성이 흔하다.

```swift
if fileManager.fileExists(atPath: "/Applications/Cydia.app") { return true }
if UIApplication.shared.canOpenURL(URL(string:"cydia://package/x")!) { return true }
```

## 공격·우회 구문

허가된 대상에서만. 클래스명 맹글링은 [Frida 메서드 후킹](/notes/mobile-frida-method-hooking/) 참고.

### 탐지 함수 반환 뒤집기 (Frida)

```javascript
var cls = "_TtC<모듈><클래스>";       // Swift 맹글링
var fn  = "- isJailbroken";
Interceptor.attach(ObjC.classes[cls][fn].implementation, {
  onLeave: function (ret) { ret.replace(0x0); } // true→false
});
```

### 개별 신호 속이기

```javascript
// fileExists 가 탈옥 경로에 대해 false 반환하도록
var FM = ObjC.classes.NSFileManager;
Interceptor.attach(FM["- fileExistsAtPath:"].implementation, {
  onEnter: function (args) {
    this.p = new ObjC.Object(args[2]).toString();
  },
  onLeave: function (ret) {
    if (this.p.indexOf("Cydia") >= 0 || this.p.indexOf("/bin/") >= 0 ||
        this.p.indexOf("apt") >= 0) ret.replace(0x0);
  }
});
```

### 보편 스크립트

```
공개 jailbreak detection bypass 스크립트(codeshare)로 다수 구현 일괄 처리
탐지가 디버깅까지 끄면(disablePtrace) spawn(-f)으로 시작 전에 후킹
```

## 참고 자료

- [OWASP MASTG: Testing Jailbreak Detection (iOS)](https://mas.owasp.org/MASTG/techniques/ios/)
- [OWASP MASVS: Resilience (MASVS-RESILIENCE)](https://mas.owasp.org/MASVS/09-MASVS-RESILIENCE/)
- [Frida CodeShare](https://codeshare.frida.re/browse)
