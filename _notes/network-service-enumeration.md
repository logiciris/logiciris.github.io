---
title: "네트워크 서비스 열거 (FTP·SSH·SMB·SMTP)"
date: 2026-10-17 09:00:00 +0900
categories: [Network, Enumeration]
tags: [enumeration, ftp, ssh, smb, smtp, services]
description: "열린 서비스에서 버전·계정·공유·설정을 캐내 공격 입력을 만드는 서비스별 열거의 개념과 구문(FTP·SSH·SMB·SMTP)을 정리합니다."
mermaid: true
---

> 포트가 열려 있다는 것만으론 부족하다. 각 서비스에서 **버전·익명 접근·계정·공유·설정**을 캐내야 공략 입력이 나온다. 서비스마다 캐낼 것과 방법이 정해져 있다.

## 개념

- **FTP(21)**: 익명 로그인 허용 여부, 쓰기 가능 디렉터리, 버전별 알려진 취약점, 평문 전송.
- **SSH(22)**: 버전·지원 인증 방식(패스워드/키), 사용자 열거 가능 여부, 약한 자격증명.
- **SMB(139/445)**: 널 세션, 공유 목록, 사용자·그룹, 정책, 버전별 취약점. 내부망에서 가장 정보가 많이 나오는 서비스.
- **SMTP(25)**: `VRFY`/`EXPN`/`RCPT`로 사용자 계정 존재 여부 열거, 오픈 릴레이.

공통 원칙: **버전 → 알려진 취약점**, **익명/널 → 바로 정보**, **계정 열거 → 인증 공격 입력**.

## 공격·확인 구문

허가된 대상에서만.

### FTP

```bash
nmap -sV -p21 --script ftp-anon target.example   # 익명 접근
ftp target.example                               # anonymous / 임의 메일
```

### SSH

```bash
nmap -p22 --script ssh2-enum-algos,ssh-auth-methods target.example
ssh-keyscan target.example                       # 호스트 키/버전
```

### SMB (내부망 정보 금광)

```bash
nmap -p445 --script "smb-os-discovery,smb-enum-shares,smb-enum-users" target.example
enum4linux -a target.example | tee smb.txt       # 공유·사용자·정책 종합
smbclient -L //target.example/ -N                # 널 세션 공유 목록
crackmapexec smb target.example -u '' -p ''      # 널 인증 확인
```

### SMTP 사용자 열거

```bash
nc target.example 25
VRFY admin            # 250/252=존재 추정, 550=없음
# 또는 소켓으로 VRFY 반복해 계정 목록 수집
```

## 참고 자료

- [OWASP WSTG: Enumerate Applications/Infrastructure](https://owasp.org/www-project-web-security-testing-guide/)
- [MITRE ATT&CK: Discovery](https://attack.mitre.org/tactics/TA0007/)
- [Nmap NSE Scripts](https://nmap.org/nsedoc/)
