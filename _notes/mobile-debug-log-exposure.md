---
title: "모바일 디버그 로그 내 민감정보 노출"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Storage]
tags: [android, ios, logcat, logging, information-disclosure]
description: "logcat·시스템 콘솔에 자격증명·토큰·응답 본문이 찍히는지 보는 모바일 디버그 로그 점검의 개념과 수집 구문을 정리합니다."
mermaid: true
---

> 개발 중 넣은 로그가 운영 빌드에 남아 비밀번호·토큰·응답 본문을 그대로 찍는 경우가 많다. 앱을 조작하며 로그를 수집해 민감정보가 노출되는지 본다.

## 개념

- **Android – logcat**: 모든 앱 로그가 `logcat`에 모인다. 대상 앱 PID로 필터해 수집한 뒤, 비밀값·토큰·전체 응답 본문이 찍히는지 검사한다.
- **iOS – 시스템 콘솔**: 단말을 맥 콘솔(또는 윈도우 로그 도구)에 연결하고, 앱 이름으로 필터해 동작 중 로그를 수집한다.
- 민감정보가 로그에 남으면, 같은 단말의 다른 앱·백업·원격 로그 수집으로 유출될 수 있다(특히 구버전 Android의 공유 로그 접근).

## 공격·확인 구문

허가된 단말에서만.

### Android logcat 수집

```bash
# 앱 PID 로 필터해 파일로
adb logcat --pid=<pid> -d -f /sdcard/log.txt
adb logcat --pid=<pid> -d > log.txt
```

### iOS 콘솔 수집

```
mac: Console.app → 연결된 iPhone 선택 → 앱 실행 → 동작 → 검색창에 앱명
로그 전체 복사 후 에디터에 붙여 비밀값 검색
windows: 기기 로그 도구의 realtime log
```

### 확인 관점

```
비밀번호·토큰·주민번호 등 민감값이 로그에 평문으로 찍히는가
요청/응답 전체 본문이 디버그 로그로 남는가
스택트레이스에 내부 경로·키가 노출되는가
```

## 참고 자료

- [OWASP MASTG: Testing Logs for Sensitive Data](https://mas.owasp.org/MASTG/techniques/)
- [OWASP MASVS: Storage (MASVS-STORAGE)](https://mas.owasp.org/MASVS/05-MASVS-STORAGE/)
- [CWE-532: Insertion of Sensitive Information into Log File](https://cwe.mitre.org/data/definitions/532.html)
