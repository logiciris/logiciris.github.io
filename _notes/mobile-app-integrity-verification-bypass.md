---
title: "모바일 앱 무결성 검증 우회"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Anti-Tampering]
tags: [android, ios, integrity, code-signing, repackaging, ldid]
description: "서명 해시·바이너리 해시로 변조를 탐지하는 모바일 무결성 검증의 원리와, 검증 지점을 패치하거나 재서명해 우회하는 흐름을 정리합니다."
mermaid: true
---

> 무결성 검증은 앱이 변조·재패키징됐는지 서명/바이너리 해시로 확인해 변조 시 종료한다. 검증이 **클라이언트 안에서** 결론을 내면, 그 분기를 패치하거나 검증 함수를 후킹해 우회할 수 있다.

## 개념

- **Android – 서명 해시**: 설치된 앱의 서명 인증서(`signingInfo.apkContentsSigners`)를 SHA로 해시해 상수값과 비교, 불일치면 `finishAffinity()`로 종료. 재패키징하면 서명이 바뀌어 걸린다.
- **iOS – 바이너리 해시**: 앱 바이너리(`Bundle.main.executablePath`)의 SHA-256을 계산해 서버에 저장된 값과 비교. 변조 바이너리면 해시가 달라져 종료.
- **약점**: 비교가 클라이언트에서 끝나면, 비교 분기를 뒤집거나(smali 패치), 검증 함수 반환을 후킹하면 통과한다. 재패키징 후에는 **재서명**이 필요하다.

```kotlin
if (Constants.C_HASH_KEY != hashKey) activity.finishAffinity() // 분기 패치 대상
```

## 공격·우회 구문

허가된 대상에서만.

### 검증 분기 패치 (Android smali)

```smali
# 불일치 시 종료하는 분기를 무조건 통과로 수정
# if-ne → goto, 또는 비교 결과를 같음으로 고정
```

### 검증 함수 후킹 (Frida)

```javascript
Java.perform(function () {
  var C = Java.use("com.example.app.IntegrityChecker");
  C.onCheckIntegrity.implementation = function (a) { return; }; // no-op
});
```

### iOS 덤프·패치·재서명

```bash
# 1) 복호화된 바이너리 덤프 → 2) 검증 분기 hex 패치(예: 00→11)
# 3) 재서명 (entitlements 추출 후 서명)
ldid -e example > ent.xml
chmod +x example
ldid -Sent.xml example
```

### 바이너리 해시 확인

```bash
shasum -a 256 <binary>   # 원본/변조본 해시 비교
```

## 참고 자료

- [OWASP MASTG: File Integrity Checks](https://mas.owasp.org/MASTG/techniques/)
- [OWASP MASVS: Resilience (MASVS-RESILIENCE)](https://mas.owasp.org/MASVS/09-MASVS-RESILIENCE/)
- [CWE-345: Insufficient Verification of Data Authenticity](https://cwe.mitre.org/data/definitions/345.html)
