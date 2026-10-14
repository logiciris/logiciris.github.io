---
title: "iOS RASP·App Attest 우회 관점"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Anti-Tampering]
tags: [ios, app-attest, rasp, frida, bypass]
description: "App Attest·상용 RASP 솔루션이 앱 정상성을 증명·보호하는 방식과, 검증이 클라이언트에서 끝날 때 함수 재정의로 우회하는 관점을 정리합니다."
mermaid: true
---

> App Attest·상용 RASP(Runtime Application Self-Protection)는 앱이 변조·탈옥 환경에서 도는지 런타임에 판단하고 서버에 정상성을 증명한다. 증명·검증이 **클라이언트 안에서** 결론을 내면, 그 함수를 후킹해 통과시킬 여지가 생긴다.

## 개념

- **App Attest(DeviceCheck)**: 하드웨어 키로 앱 인스턴스의 정상성 증명서를 만들어 서버가 검증. 서버가 증명을 **실제로 강하게 검증**하면 클라이언트 후킹만으로는 뚫기 어렵다. 반대로 결과 플래그를 클라이언트에서 쓰기만 하면, 조회 후 **함수 재정의**로 우회된다.
- **상용 RASP**: 탈옥/디버거/후킹 탐지, 무결성 검사, 통신 보호를 묶어 제공(App Attest, Talsec freeRASP, JailMonkey 등). 각 체크는 결국 Boolean/콜백으로 귀결되므로, 체크 함수·콜백을 후킹하는 것이 접근점이다.
- 핵심 판단: **검증 결론이 어디서 나는가.** 서버에서 최종 판정하면 클라이언트 우회가 무의미하고, 클라이언트에서 끝나면 후킹 대상이 된다.

## 공격·우회 구문

허가된 대상에서만. 클래스명 해석은 [Frida 메서드 후킹](/notes/mobile-frida-method-hooking/) 참고.

### Attest/보호 결과 함수 재정의

```javascript
// attest 조회 후 결과를 쓰는 함수의 반환/콜백을 '정상'으로 고정
Interceptor.attach(ObjC.classes[cls][fn].implementation, {
  onLeave: function (ret) { ret.replace(0x1); } // 정상 처리로
});
```

### 서버 의존도 확인 (우회 가능성 판단)

```
attest 증명을 서버가 실제로 검증하는가, 아니면 클라 플래그만 쓰는가
탐지 콜백(onThreatDetected 류)이 클라에서 종료를 트리거하는가
→ 클라에서 끝나면 해당 함수 후킹으로 우회 여지
→ 서버 판정이면 네트워크·증명 위조 난도 급상승
```

## 참고 자료

- [Apple: Establishing your app's integrity (App Attest)](https://developer.apple.com/documentation/devicecheck)
- [OWASP MASTG: File Integrity / Resiliency (iOS)](https://mas.owasp.org/MASTG/techniques/ios/)
- [OWASP MASVS: Resilience (MASVS-RESILIENCE)](https://mas.owasp.org/MASVS/09-MASVS-RESILIENCE/)
