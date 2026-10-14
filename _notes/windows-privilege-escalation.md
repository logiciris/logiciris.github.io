---
title: "윈도우 권한 상승"
date: 2026-10-17 09:00:00 +0900
categories: [Penetration Testing, Privilege Escalation]
tags: [windows, privesc, service-hijacking, dll-hijacking, tokens, scheduled-tasks]
description: "윈도우에서 낮은 권한을 SYSTEM으로 올리는 열거와 악용 경로 — 서비스 바이너리·DLL 하이재킹·따옴표 없는 경로·토큰·예약 작업 — 를 정리합니다."
mermaid: true
---

> 윈도우 권한 상승은 **열거가 9할**이다. 권한·토큰·서비스·설치 소프트웨어·설정을 샅샅이 훑어 약한 지점을 찾는다. 상승은 보통 서비스·DLL·토큰 권한의 설정 오류를 엮어 SYSTEM으로 간다.

## 개념

- **상황 인식 열거**: 현재 사용자·그룹·권한(`whoami /all`), 설치 소프트웨어·패치, 네트워크, 자격증명 흔적(설정파일·레지스트리·히스토리·저장된 비밀번호).
- **권한·토큰**: `SeImpersonatePrivilege`/`SeAssignPrimaryToken` 보유 시 토큰 가장(potato 계열)으로 SYSTEM.
- **서비스 바이너리 하이재킹**: 서비스 실행 파일이 **쓰기 가능**하면 악성 바이너리로 교체 후 서비스 재시작.
- **DLL 하이재킹**: 프로그램이 찾는 DLL을 검색 순서상 먼저 발견되는 쓰기 가능 경로에 심는다.
- **따옴표 없는 서비스 경로(Unquoted Path)**: `C:\Program Files\...`처럼 공백 포함 경로에 따옴표가 없으면, 상위 경로에 `Program.exe`를 두어 가로챈다.
- **예약 작업(Scheduled Tasks)**: 높은 권한으로 도는 작업의 대상 스크립트·바이너리가 쓰기 가능하면 교체.
- **PowerShell**: 열거·히스토리·자격증명(스크립트·이력) 수집의 금광.

## 공격·확인 구문

허가된 대상에서만.

### 열거

```cmd
whoami /all  :: 사용자·그룹·권한
systeminfo  :: 패치 수준·OS 버전
```
```powershell
Get-LocalUser; Get-LocalGroupMember Administrators
Get-ChildItem -Recurse -Include *.config,*.xml -ErrorAction SilentlyContinue |
  Select-String -Pattern 'password'
Get-History; (Get-PSReadlineOption).HistorySavePath
```

### 서비스·경로 점검

```cmd
sc qc <service>  :: 서비스 바이너리 경로
icacls "C:\path\to\service.exe"  :: 쓰기 권한 여부
wmic service get name,pathname,startmode | findstr /i /v """"  :: 따옴표 없는 경로
```

### 자동화 열거

```
winPEAS / PowerUp(Invoke-AllChecks) 로 상승 후보 일괄 탐지
```

### 전형적 악용(개념)

```
SeImpersonate 보유 → 토큰 가장으로 SYSTEM
쓰기 가능 서비스 바이너리/경로 → 악성 교체 후 재시작
Unquoted path + 중간 경로 쓰기 → Program.exe 가로채기
높은 권한 예약 작업의 쓰기 가능 대상 → 교체
```

## 참고 자료

- [MITRE ATT&CK: Privilege Escalation](https://attack.mitre.org/tactics/TA0004/)
- [PEASS-ng (winPEAS)](https://github.com/peass-ng/PEASS-ng)
- [CWE-426: Untrusted Search Path](https://cwe.mitre.org/data/definitions/426.html)
