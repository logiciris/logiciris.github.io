---
title: "포트·서비스 스캐닝"
date: 2026-10-17 09:00:00 +0900
categories: [Network, Scanning]
tags: [nmap, port-scanning, tcp, syn-scan, service-detection]
description: "TCP Connect와 SYN 스캔의 차이, UDP 스캔, 서비스·버전 탐지, 호스트 발견까지 포트 스캐닝의 원리와 Nmap 구문을 정리합니다."
mermaid: true
---

> 스캐닝은 "살아있는 호스트 → 열린 포트 → 서비스·버전"으로 범위를 좁히는 단계다. 스캔 방식마다 정확도·속도·흔적이 다르므로, 원리를 알고 상황에 맞게 고른다.

## 개념

- **호스트 발견**: 대역에서 살아있는 호스트부터 추린다(ICMP·ARP·일부 포트 probe).
- **TCP Connect vs SYN**:
  - **Connect 스캔**: 3-way 핸드셰이크를 완성(SYN→SYN/ACK→ACK). 권한이 낮아도 되지만 느리고 로그에 연결로 남는다.
  - **SYN(half-open) 스캔**: SYN만 보내고 SYN/ACK를 받으면 RST로 끊는다. 빠르고 상대적으로 덜 남지만 raw 소켓 권한 필요.
- **UDP 스캔**: 응답이 없으면 open|filtered로 모호. 느리고 해석이 까다롭다.
- **서비스·버전 탐지**: 배너·프로브로 서비스와 버전을 식별 → 취약점 대조의 입력.
- **NSE(Nmap Scripting Engine)**: 스크립트로 열거·취약점 점검을 자동화.

```
닫힌 포트: SYN → RST
열린 포트: SYN → SYN/ACK   (SYN 스캔은 여기서 RST 로 중단)
필터링:   SYN → (무응답/ICMP unreachable)
```

## 공격·확인 구문

허가된 대상에서만.

### 호스트 발견·기본 스캔

```bash
nmap -sn <subnet>/24                 # 핑 스윕(호스트 발견만)
nmap -sS -p- target.example          # SYN, 전체 포트
nmap -sT -p 1-1000 target.example    # Connect(권한 낮을 때)
nmap -sU --top-ports 50 target.example  # UDP 상위 포트
```

### 서비스·버전·스크립트

```bash
nmap -sV -sC -p 22,80,445 target.example   # 버전 탐지 + 기본 NSE
nmap -A target.example                      # OS/버전/스크립트/트레이스
nmap --script "ftp-* and not brute" -p 21 target.example
```

### 속도 조절

```bash
nmap -sS --min-rate 5000 --max-retries 1 -p- target.example
# --min-rate: 초당 최소 패킷 / --max-retries: 재시도 횟수 축소
-T4                                   # 타이밍 템플릿(빠르게)
```

## 참고 자료

- [Nmap Reference Guide](https://nmap.org/book/man.html)
- [Nmap Scripting Engine (NSE)](https://nmap.org/book/nse.html)
- [OWASP WSTG: Enumerate Infrastructure](https://owasp.org/www-project-web-security-testing-guide/)
