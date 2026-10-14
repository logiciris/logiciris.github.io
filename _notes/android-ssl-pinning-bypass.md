---
title: "안드로이드 SSL 피닝 우회"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Network]
tags: [android, ssl-pinning, frida, burp, mitm]
description: "프록시 인증서를 신뢰시켜도 앱 트래픽이 안 잡히는 SSL 피닝의 원리와, Frida로 피닝 검증을 무력화해 중간자 가로채기를 성립시키는 방법을 정리합니다."
mermaid: true
---

> 프록시 인증서를 단말에 깔았는데도 앱 패킷이 Burp에 안 잡힌다면, 앱이 **SSL 피닝**으로 서버 인증서를 직접 검증하고 있을 가능성이 높다. 피닝 검증 지점을 런타임에 무력화하면 중간자 가로채기가 성립한다.

## 개념

일반 TLS는 OS 신뢰 저장소의 CA면 통과시키므로, 프록시 CA를 신뢰 저장소에 넣으면 가로채진다. **SSL 피닝**은 앱이 특정 인증서/공개키를 코드에 고정해두고 그것과만 일치할 때 연결을 허용한다. 그래서 프록시 CA를 신뢰시켜도 피닝 검증에서 끊긴다.

우회의 핵심은 **피닝을 수행하는 코드 경로**(TrustManager·OkHttp CertificatePinner·네이티브 검증 등)를 후킹해 "검증 통과"로 바꾸는 것이다. 보편 우회 스크립트가 여러 구현을 한꺼번에 노린다.

```
웹만 잡히고 앱은 안 잡힘  →  피닝 의심
프록시 CA 신뢰시켜도 실패  →  코드 경로 후킹 필요
```

## 공격·우회 구문

허가된 대상에서만.

### 보편 피닝 우회 (Frida)

```bash
# 공개 universal android ssl pinning bypass 스크립트 사용
frida -U -f com.example.app -l universal-pinning-bypass.js
# https://codeshare.frida.re/@pcipolloni/universal-android-ssl-pinning-bypass-with-frida/
```

### 프록시 설정 (Burp)

```
Burp Proxy Listener: 모든 인터페이스, 임의 포트
단말 Wi-Fi 프록시 → <mac-ip>:<port>
프록시 CA 를 단말 신뢰 저장소에 설치
앱이 여전히 막히면 → 피닝 우회 스크립트 병행
```

### 네이티브 피닝(.so) 대응

```
자바 후킹으로 안 풀리면 lib*.so 내 검증 함수를 Frida Interceptor 로 후킹
또는 패치 후 재빌드
```

## 참고 자료

- [OWASP MASTG: Testing Network Communication (Android)](https://mas.owasp.org/MASTG/techniques/android/MASTG-TECH-0012/)
- [Frida CodeShare: SSL Pinning Bypass](https://codeshare.frida.re/browse)
- [CWE-295: Improper Certificate Validation](https://cwe.mitre.org/data/definitions/295.html)
