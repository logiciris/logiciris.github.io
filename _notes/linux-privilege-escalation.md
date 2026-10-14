---
title: "리눅스 권한 상승"
date: 2026-10-17 09:00:00 +0900
categories: [Penetration Testing, Privilege Escalation]
tags: [linux, privesc, suid, sudo, cron, capabilities]
description: "낮은 권한 셸에서 루트로 올라가는 리눅스 권한 상승의 열거 포인트 — SUID·sudo·cron·capabilities·PATH·커널 — 와 확인 구문을 정리합니다."
mermaid: true
---

> 발판을 얻은 뒤의 과제는 "어떻게 루트가 되는가"다. 리눅스 권한 상승은 대부분 **설정 오류**에서 나온다 — 과한 SUID, 느슨한 sudo, 쓰기 가능한 cron, 위험한 capability. 핵심은 철저한 로컬 열거다.

## 개념

흔한 상승 경로와 각각 무엇을 보는가:

- **SUID/SGID 바이너리**: 소유자 권한으로 실행되는 바이너리. 셸 탈출이 가능한 바이너리(GTFOBins)가 SUID면 루트 셸.
- **sudo 설정**: `sudo -l`로 비밀번호 없이 실행 가능한 명령 확인. 많은 명령이 셸 탈출/파일 쓰기로 이어진다.
- **cron 작업**: root로 도는 스크립트가 **쓰기 가능**하거나 상대경로·와일드카드를 쓰면 주입 가능.
- **capabilities**: `cap_setuid` 등 위험한 capability가 붙은 바이너리.
- **PATH 하이재킹**: root 스크립트가 절대경로 없이 명령을 부르면, PATH 앞에 악성 동명 바이너리를 둔다.
- **커널/서비스 익스플로잇**: 커버전 대조 후 로컬 익스플로잇(최후수단).
- **자격증명 재사용**: 설정파일·히스토리·백업의 평문 비밀번호.

## 공격·확인 구문

허가된 대상에서만.

### 로컬 열거

```bash
id; sudo -l                           # 현재 권한·sudo 규칙
find / -perm -4000 -type f 2>/dev/null   # SUID 바이너리
getcap -r / 2>/dev/null               # capabilities
cat /etc/crontab; ls -la /etc/cron.*  # cron 작업·권한
uname -a; cat /etc/os-release         # 커널·배포판 버전
grep -rniE 'password|secret' /etc /home 2>/dev/null   # 평문 자격증명
```

### 자동화 열거

```bash
./linpeas.sh            # 종합 열거(의심 지점 하이라이트)
```

### 전형적 악용(개념)

```
SUID 셸탈출 바이너리 → GTFOBins 구문으로 루트 셸
sudo NOPASSWD 편집기/인터프리터 → 셸 탈출
쓰기 가능한 root cron 스크립트 → 리버스 셸 삽입
PATH 미지정 cron → PATH 앞에 동명 악성 바이너리
cap_setuid 바이너리 → setuid(0) 후 셸
```

## 참고 자료

- [GTFOBins](https://gtfobins.github.io/)
- [PEASS-ng (linPEAS)](https://github.com/peass-ng/PEASS-ng)
- [CWE-250: Execution with Unnecessary Privileges](https://cwe.mitre.org/data/definitions/250.html)
