---
title: "Frida 메서드 후킹과 클래스명 해석"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Dynamic]
tags: [frida, hooking, swift, objective-c, jadx]
description: "앱의 특정 동작을 담당하는 메서드를 찾아 Frida로 후킹하는 흐름과, Swift·Objective-C 심볼 맹글링에서 클래스·함수명을 올바로 지정하는 법을 정리합니다."
mermaid: true
---

> 탐지·검증 로직을 바꾸려면 먼저 **어느 클래스의 어느 메서드가 그 동작을 하는지** 찾아야 한다. 동적으로 호출 흐름을 관찰해 후보를 좁히고, 정적 분석으로 시그니처를 확인한 뒤 후킹 스크립트를 건다.

## 개념

후킹 대상 찾기의 전형적인 흐름:

1. 앱을 Frida로 실행하며 액티비티/메서드 호출을 로깅(어떤 클래스·메서드가 언제 불리는지 관찰).
2. 취약점 트리거 동작(버튼 클릭 등)을 한 시각과 로그 타임스탬프를 맞춰, 그 동작을 담당하는 클래스·메서드를 특정.
3. 디컴파일러로 해당 메서드 시그니처를 확인.
4. 그 메서드의 `implementation`을 재정의하는 스크립트 작성.

**심볼 맹글링 주의**: iOS에서 탐지 함수의 클래스·메서드명은 Objective-C냐 Swift냐에 따라 표기가 다르다. 디스어셈블러에 아래처럼 보인다면,

```
; bool -[ExampleModule.JailBreak hasJailbreak](_TtC13ExampleModule9JailBreak *self, SEL)
___TtC13ExampleModule9JailBreak_hasJailbreak_
```

Frida에 넘길 실제 클래스·함수명은 맹글링된 Swift 심볼과 메서드 라벨로 지정한다.

## 공격·우회 구문

허가된 대상에서만.

### 클래스·함수명 지정 (Swift 맹글링)

```javascript
// _TtC<모듈길이><모듈><클래스길이><클래스> 형태
var className = "_TtC13ExampleModule9JailBreak";
var funcName  = "- hasJailbreak";
```

### Boolean 반환 탐지 함수 무력화 (iOS)

```javascript
var hook = ObjC.classes[className][funcName];
Interceptor.attach(hook.implementation, {
  onLeave: function (ret) {
    ret.replace(0x0); // true→false 로 탈옥/루팅 '아님' 반환
  }
});
```

### Java 메서드 재정의 (Android)

```javascript
Java.perform(function () {
  var C = Java.use("com.example.app.SecurityCheck");
  C.isRooted.implementation = function () { return false; };
});
```

### 서브루틴 주소 기반 (심볼 없을 때)

```
브레이크포인트/후킹을 [서브루틴 주소]+[모듈 베이스 주소] 로 지정
App Attest류: attest 조회 함수를 찾아 반환/검증 로직을 재정의
```

## 참고 자료

- [Frida: JavaScript API](https://frida.re/docs/javascript-api/)
- [Frida CodeShare](https://codeshare.frida.re/browse)
- [OWASP MASTG: Reverse Engineering](https://mas.owasp.org/MASTG/techniques/)
