---
title: "안드로이드 루팅 탐지 우회"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Anti-Tampering]
tags: [android, root-detection, frida, bypass]
description: "test-keys·su/busybox 경로·Superuser·su 실행 가능 여부로 루팅을 판별하는 안드로이드 탐지 로직의 생김새와, 그 판별을 런타임에 뒤집는 우회를 정리합니다."
mermaid: true
---

> 루팅 탐지는 "이 단말이 루팅됐는가"를 여러 신호로 판별해 앱을 종료시킨다. 신호는 정해져 있으므로, 탐지 함수가 어디서 무엇을 보는지 알면 그 반환을 뒤집어 우회한다.

## 개념

전형적인 루팅 판별 신호(아래 중 하나라도 걸리면 루팅으로 간주하는 함수가 많다):

- `Build.TAGS`에 `test-keys` 포함(커스텀 롬 흔적).
- `su`·`busybox` 바이너리가 `/system/bin`, `/system/xbin`, `/sbin`, `/data/local/...` 등 경로에 존재.
- `/system/app/Superuser.apk` 존재.
- `Runtime.getRuntime().exec("su")`가 예외 없이 실행됨.

이 신호들을 모은 `Boolean` 함수(예: `onCheckOSFalsify()`)가 하나로 결론 내는 구조라, 그 함수의 반환을 `false`로 고정하거나 개별 체크(`File.exists`, `exec`)를 속이면 통과한다.

```java
if (Build.TAGS.contains("test-keys")) return true;
if (new File("/system/xbin/su").exists()) return true;
Runtime.getRuntime().exec("su"); // 성공하면 루팅
```

## 공격·우회 구문

허가된 대상에서만.

### 판별 함수 자체를 뒤집기 (Frida)

```javascript
Java.perform(function () {
  var C = Java.use("com.example.app.security.RootCheck");
  C.onCheckOSFalsify.implementation = function () { return false; };
});
```

### 개별 신호 속이기

```javascript
Java.perform(function () {
  // su/busybox 경로 존재 체크 무력화
  var File = Java.use("java.io.File");
  File.exists.implementation = function () {
    var p = this.getAbsolutePath();
    if (p.indexOf("su") >= 0 || p.indexOf("busybox") >= 0 ||
        p.indexOf("Superuser") >= 0) return false;
    return this.exists();
  };
  // Runtime.exec("su") 차단
  var RT = Java.use("java.lang.Runtime");
  RT.exec.overload('java.lang.String').implementation = function (cmd) {
    if (cmd.indexOf("su") >= 0) throw Java.use("java.io.IOException").$new("blocked");
    return this.exec(cmd);
  };
});
```

### 네이티브·보편 스크립트

```
탐지가 .so 에 있으면 네이티브 함수 Interceptor 후킹
공개 root-detection bypass 스크립트(codeshare)로 다수 구현 일괄 처리
```

## 참고 자료

- [OWASP MASTG: Testing Root Detection (Android)](https://mas.owasp.org/MASTG/techniques/android/)
- [OWASP MASVS: Resilience (MASVS-RESILIENCE)](https://mas.owasp.org/MASVS/09-MASVS-RESILIENCE/)
- [Frida CodeShare](https://codeshare.frida.re/browse)
