---
title: "정찰·스캐닝 도구 치트시트"
date: 2026-10-17 09:00:00 +0900
categories: [Penetration Testing, Reconnaissance]
tags: [nmap, dns, snmp, recon, scanning, cheatsheet]
description: "nmap 포트·서비스 스캔, DNS·SNMP 열거, whois·메타데이터 수집까지 정찰 단계에서 쓰는 명령을 상황별로 정리한 치트시트입니다."
mermaid: true
---

> 정찰은 "뭐가 떠 있는지"를 먼저 그리는 단계입니다. 호스트가 살아 있는지 → 어떤 포트가 열렸는지 → 그 포트가 무슨 서비스·버전인지 → 그 서비스가 뭘 흘리는지 순으로 좁혀 갑니다. 아래 예시의 대상은 전부 `$TARGET`·`example.com`·문서용 대역(`203.0.113.0/24`)이며, 실제 대상은 **허가된 범위**에서만 바꿔 씁니다.

## 개념

정찰에서 한 번에 다 보려 하면 느리고 놓칩니다. 단계를 나눕니다.

```mermaid
flowchart LR
  A[호스트 탐지] --> B[포트 스캔]
  B --> C[서비스/버전]
  C --> D[서비스별 열거]
  D -.새 호스트/도메인.-> A
```

- **호스트 탐지(핑 스윕)**: 대역에서 살아 있는 IP만 추립니다. ICMP가 막혀도 포트 기반으로 탐지합니다.
- **포트 스캔**: 빠른 상위 포트 → 전체 포트 순. 여기서 많이 놓치는 게 **고(高)포트의 비표준 서비스**라, 급할수록 전체 포트(`-p-`)를 한 번은 돌립니다.
- **서비스/버전**: 버전을 알아야 알려진 취약점·기본 계정을 대조할 수 있습니다.
- **서비스별 열거**: 포트마다 전용 도구로 넘어갑니다(아래 표의 Next).

## 공격·우회 구문

허가된 범위에서만. 대상은 전부 플레이스홀더입니다.

### nmap — 포트·서비스 스캔

| 상황 | 명령 |
|---|---|
| 빠른 상위 포트 | `nmap --top-ports=100 -T4 $TARGET` |
| 전체 TCP(놓침 방지) | `nmap -p- -T4 $TARGET -oN tcp-full.txt` |
| 서비스/버전+기본 스크립트 | `nmap -sS -sV -sC -p 80,443 $TARGET` |
| UDP 핵심 포트 | `sudo nmap -sU -p 53,161 $TARGET` |
| 핑 생략(방화벽 뒤) | `nmap -Pn -n $TARGET` |
| 핑 스윕(대역) | `nmap -sn 203.0.113.0/24 -oG sweep.txt` |
| OS 추정 | `sudo nmap -O --osscan-guess $TARGET` |
| NSE 취약점 스캔 | `nmap -sV --script vuln -p 443 $TARGET` |

열린 포트만 다음 단계로 넘길 때, grepable 결과에서 포트 번호만 뽑으면 편합니다.

```bash
grep -E '^[0-9]+/tcp' tcp-full.txt | cut -d/ -f1 | paste -sd,
# → 22,80,443,3306 ...
```

> 판단 포인트: `-sV`가 "tcpwrapped"나 애매한 버전을 주면, 해당 포트에 전용 도구(`curl`, `smbclient`, `snmpwalk`)로 직접 말을 걸어 확인합니다. nmap 한 줄로 끝났다고 믿지 않습니다.

### DNS 열거

| 상황 | 명령 |
|---|---|
| 레코드 종류별 조회 | `host -t ns example.com` · `host -t mx example.com` · `host -t txt example.com` |
| 표준 열거 | `dnsrecon -d example.com -t std` |
| 서브도메인 사전 공격 | `dnsrecon -d example.com -D subs.txt -t brt` |
| 도구로 한 번에 | `dnsenum --threads 50 example.com` |
| 역방향 스윕 | `for i in $(seq 1 254); do host 203.0.113.$i; done \| grep -v "not found"` |

### SNMP 열거 (UDP 161)

커뮤니티 문자열(SNMP의 평문 "암호") 추측이 먼저입니다.

```bash
# 커뮤니티 문자열 사전 공격
onesixtyone -c community.txt -i targets.txt

# 유효한 문자열로 전체 트리 덤프
snmpwalk -v2c -c public $TARGET

# 자주 보는 OID — 실행 프로세스 / 설치 소프트웨어 / 열린 TCP 포트
snmpwalk -v2c -c public $TARGET 1.3.6.1.2.1.25.4.2.1.2
snmpwalk -v2c -c public $TARGET 1.3.6.1.2.1.25.6.3.1.2
snmpwalk -v2c -c public $TARGET 1.3.6.1.2.1.6.13.1.3
```

> 판단 포인트: SNMP는 사용자명·프로세스·소프트웨어·내부 포트를 통째로 흘리는 경우가 많아, "별것 없어 보이는 161"에서 정보가 가장 많이 나올 때가 잦습니다.

### whois / 메타데이터

| 상황 | 명령 |
|---|---|
| 도메인·IP 등록정보 | `whois example.com` · `whois 203.0.113.10` |
| 문서 메타데이터(작성자 등) | `exiftool -a -u report.pdf` |
| PDF 텍스트 추출 | `pdftotext report.pdf -` |
| NetBIOS 이름 스캔 | `sudo nbtscan -r 203.0.113.0/24` |

## 함께 보기

- [정보 수집: 수동·능동 정찰](/notes/reconnaissance-passive-active/)
- [포트·서비스 스캐닝](/notes/port-and-service-scanning/)
- [네트워크 서비스 열거 (FTP·SSH·SMB·SMTP)](/notes/network-service-enumeration/)

## 참고 자료

- [Nmap Reference Guide](https://nmap.org/book/man.html)
- [RFC 1157: Simple Network Management Protocol](https://www.rfc-editor.org/rfc/rfc1157)
- [MITRE ATT&CK: Active Scanning (T1595)](https://attack.mitre.org/techniques/T1595/)
