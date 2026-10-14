---
title: "기본 계정·설정 미흡 (Default Credentials)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Configuration]
tags: [default-credentials, misconfiguration, web]
description: "기본 관리자 계정·노출된 관리 화면·디버그 엔드포인트·환경변수 비밀처럼 설치 후 정리가 안 된 설정 미흡의 개념과 점검 구문을 정리합니다."
mermaid: true
---

> 가장 흔하고 가장 쉽게 뚫리는 결함은 **설치 기본값이 운영에 그대로 남은 것**이다. 기본 계정, 노출된 관리 콘솔, 켜진 디버그, 보호 안 된 설정이 공격의 첫 진입로가 된다.

## 개념

제품·프레임워크·인프라는 설치 시 기본 계정과 기본 설정을 둔다. 이를 바꾸지 않으면 공개된 자격증명·경로로 바로 접근된다 — 관리자 기본 계정, 관리 콘솔(DB·모니터링·CI), 기본 API 키, 샘플 앱, 디버그/상태 엔드포인트, 환경변수·설정 파일 노출.

```
admin/admin , root/(빈값) , admin/password , 제품 문서의 기본 계정
/actuator , /_debug , /server-status , /.env , /config.json
```

## 공격·우회 구문

허가된 범위에서만.

### 기본 계정·키

```
제품·프레임워크 문서의 기본 자격증명 대입:
  admin/admin, admin/password, root/root, sa/(빈값), guest/guest
기본 API 키·토큰(샘플·예제 값)이 유효한지
장비·CMS·DB 콘솔의 벤더 기본 계정
```

### 노출된 관리·디버그 화면

```
/admin /manager/html(Tomcat) /phpmyadmin /actuator /_profiler
/.env /.git/config /config.php.bak /wp-config.php~
/server-status /server-info /metrics /debug
→ 인증 없이 응답하거나 기본 계정으로 열리는지
```

### 설정·비밀 노출

```
환경변수·설정 파일이 응답·오류·소스에 노출되는지
클라우드 메타데이터(SSRF 결합): 169.254.169.254
기본 CORS·과도한 권한·비밀 평문 저장
```

### 확인 요령

```
제품/버전 식별 후 '해당 제품의 기본값' 목록으로 점검
발견 시 "기본값이다"가 아니라 "이 계정/화면으로 무엇이 되는가"를 기록
```

## 참고 자료

- [OWASP Top 10 2021: A05 Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- [CWE-1392: Use of Default Credentials](https://cwe.mitre.org/data/definitions/1392.html)
- [CWE-16: Configuration](https://cwe.mitre.org/data/definitions/16.html)
