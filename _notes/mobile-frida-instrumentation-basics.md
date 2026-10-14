---
title: "Frida 동적 계측 기초 (모바일)"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Dynamic]
tags: [frida, instrumentation, android, ios, hooking]
description: "실행 중인 모바일 앱 프로세스에 JavaScript를 주입해 함수를 가로채고 바꾸는 Frida의 동작 원리와 spawn·attach·원격 접속 구문을 정리합니다."
mermaid: true
---

> Frida는 실행 중인 프로세스에 JavaScript 엔진을 **주입**해, 앱을 다시 빌드하지 않고도 함수 호출을 가로채고 인자·반환값·네이티브 메모리를 바꾸는 동적 계측 도구다. 모바일 진단에서 탐지·검증 로직을 런타임에 무력화하는 출발점이 된다.

## 개념

핵심은 C로 작성된 코어가 대상 프로세스에 **QuickJS**(작고 삽입 가능한 JS 엔진)를 주입한다는 점이다. 주입된 스크립트는 프로세스 메모리에 완전한 접근 권한을 가져, 자바/Objective-C/Swift 메서드 후킹은 물론 네이티브 함수 직접 호출까지 한다.

- **spawn (`-f`)**: 앱을 Frida가 직접 띄우면서 시작 코드(루팅/탈옥 탐지, 무결성 검사가 보통 여기 있음)가 실행되기 **전에** 후킹을 건다.
- **attach**: 이미 실행 중인 프로세스에 붙는다. 시작 시점 로직은 놓친다.
- **USB vs 원격**: USB(`-U`)는 케이블로 붙은 단말, 원격은 단말에서 `frida-server`를 TCP로 띄워 호스트에서 접속한다.

후킹 대상(클래스·메서드)을 모를 때는 정적 분석(디컴파일)으로 찾거나, 공개 스크립트 저장소(codeshare)를 참고한다.

## 공격·우회 구문

허가된 단말·앱에서만. 자리표시자는 실제 값으로 바꾼다.

### 접속 방식

```bash
# spawn: 시작 로직 전에 후킹
frida -U -f com.example.app -l script.js

# attach: 실행 중인 앱 (앱 이름/PID)
frida -U -l script.js com.example.app

# 로그를 파일로
frida -U -f com.example.app -l script.js > log.txt
```

### 원격 접속 (frida-server)

```bash
# 단말에서 서버 기동 (아키텍처에 맞는 바이너리)
./frida-server -l 0.0.0.0:27000 &

# 호스트에서 프로세스 목록·접속
frida-ps -ai -H <device-ip>:27000
frida -H <device-ip>:27000 -f com.example.app -l script.js
```

### 정리·확인

```bash
# 남은 frida 프로세스 종료
netstat -antp | grep fri
kill -9 <pid>

# 공개 스크립트 참고
# https://codeshare.frida.re/browse
```

## 참고 자료

- [Frida Documentation](https://frida.re/docs/home/)
- [QuickJS](https://bellard.org/quickjs/)
- [OWASP MASTG: Dynamic Analysis](https://mas.owasp.org/MASTG/techniques/)
