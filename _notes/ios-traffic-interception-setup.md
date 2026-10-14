---
title: "iOS 트래픽 가로채기 환경 구성"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Network]
tags: [ios, burp, proxy, pfctl, mitm]
description: "비탈옥 아이폰의 인증서 신뢰 설정과, 맥 인터넷 공유+pfctl 투명 프록시로 앱 트래픽까지 Burp로 돌리는 iOS 가로채기 구성을 정리합니다."
mermaid: true
---

> iOS 앱 트래픽을 보려면 두 가지가 필요하다. 프록시 CA를 **완전히 신뢰**시키는 것, 그리고 앱이 프록시 설정을 무시하더라도 트래픽이 프록시로 가도록 **투명(invisible) 프록시**로 강제하는 것이다.

## 개념

- **비탈옥 단말**: Wi-Fi 수동 프록시 + Safari로 CA 설치 후, `설정 > 일반 > 정보 > 인증서 신뢰 설정`에서 그 CA를 **완전 신뢰**로 켜야 한다. 이 단계를 빼면 웹도 TLS 오류가 난다. 단, 앱이 자체 프로토콜·SSL 피닝을 쓰면 비탈옥에서는 패킷이 안 잡힐 때가 많다.
- **투명 프록시(탈옥/고급)**: 앱이 시스템 프록시를 무시해도, 네트워크 계층에서 80/443을 프록시 포트로 **리다이렉트**하면 가로채진다. 맥의 인터넷 공유로 진단용 단말에 네트워크를 주고, `pfctl` 리다이렉트 규칙 + Burp의 "invisible proxying"을 함께 쓴다.

```
[인터넷 제공 단말]→[맥 인터넷 공유(bridge)]→[진단용 단말]
                         └ pfctl rdr 80/443 → Burp(invisible)
```

## 공격·우회 구문

허가된 단말에서만. 자리표시자는 실제 값으로 바꾼다.

### 비탈옥 인증서 신뢰

```
1. Wi-Fi 수동 프록시 설정
2. Safari 에서 http://burp 로 CA 다운로드
3. 설정 > 일반 > VPN 및 기기 관리 에서 프로파일 설치
4. 설정 > 일반 > 정보 > 인증서 신뢰 설정 에서 완전 신뢰 ON
```

### 맥 인터넷 공유 + 브리지 IP 확인

```bash
# 인터넷 공유 켠 뒤 생기는 bridge 인터페이스의 inet 이 단말 프록시 주소
ifconfig | grep -A3 bridge
# 예: bridge 인터페이스의 inet <mac-bridge-ip>
```

### pfctl 투명 리다이렉트

```bash
echo "
rdr pass on bridge<N> proto tcp from any to any port 80  -> 127.0.0.1 port <burp-port>
rdr pass on bridge<N> proto tcp from any to any port 443 -> 127.0.0.1 port <burp-port>
" | sudo pfctl -f - -e

# Burp: Proxy Listener 에서 'Support invisible proxying' 체크
# 해제
sudo pfctl -d
```

## 참고 자료

- [OWASP MASTG: iOS Network Communication](https://mas.owasp.org/MASTG/techniques/ios/)
- [OpenBSD pf.conf (packet filter rules)](https://man.openbsd.org/pf.conf)
- [CWE-295: Improper Certificate Validation](https://cwe.mitre.org/data/definitions/295.html)
