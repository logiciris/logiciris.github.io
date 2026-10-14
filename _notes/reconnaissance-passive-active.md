---
title: "정보 수집: 수동·능동 정찰"
date: 2026-10-17 09:00:00 +0900
categories: [Penetration Testing, Reconnaissance]
tags: [recon, osint, dns, google-dorking, shodan, enumeration]
description: "노출된 정보만 모으는 수동 정찰과 대상에 직접 질의하는 능동 정찰로 공격면을 그리는 방법 — whois·구글 도킹·DNS 열거·쇼단 등의 개념과 구문을 정리합니다."
mermaid: true
---

> 정찰은 공격면 지도를 그리는 단계다. **수동 정찰**은 공개·제3자 정보만 모아 흔적을 안 남기고, **능동 정찰**은 대상에 직접 질의해 더 정확하지만 로그에 남는다. 좋은 침투는 좋은 정찰에서 시작한다.

## 개념

- **수동(Passive)**: 대상 인프라를 직접 건드리지 않고 수집. whois 등록 정보, 구글 도킹(노출 파일·디렉터리·로그인 페이지), 넷크래프트(기술스택·호스팅 이력), 공개 소스 저장소의 하드코딩·설정, 쇼단(노출 서비스·배너), 인증서 투명성 로그로 서브도메인.
- **능동(Active)**: 대상에 직접 질의. DNS 열거(서브도메인·레코드·존 트랜스퍼 시도), 서비스 배너 수집, 가상호스트 식별. 더 정확하지만 대상 로그에 남는다.
- 산출물은 **공격면 목록**이다: 도메인·서브도메인·IP 범위·직원·이메일 형식·기술스택·노출 서비스.

## 공격·확인 구문

허가된 대상에서만. `target.example`은 실제 대상으로.

### 수동 정찰

```bash
whois target.example                 # 등록자·네임서버·IP 범위
# 구글 도킹
site:target.example filetype:pdf
site:target.example intext:password
site:target.example inurl:admin
-site:www.target.example site:target.example   # 서브도메인 노출
# 인증서 투명성으로 서브도메인
curl -s "https://crt.sh/?q=%25.target.example&output=json" | jq -r '.[].name_value' | sort -u
```

### 능동 DNS 열거

```bash
host -t ns target.example            # 네임서버
host -t mx target.example            # 메일 서버
dnsrecon -d target.example           # 레코드 수집
dig axfr @ns1.target.example target.example   # 존 트랜스퍼(허용 시 전체 노출)
# 서브도메인 브루트포스
gobuster dns -d target.example -w subdomains.txt
```

### 노출 서비스·OSINT

```
쇼단/센시스: 노출된 서비스·배너·구버전·기본설정 검색
직원·이메일: 공개 프로필에서 이름 → 이메일 형식 추론(인증 공격 입력)
공개 저장소: 커밋 이력·설정 파일의 키·내부 URL
```

## 참고 자료

- [OWASP WSTG: Information Gathering](https://owasp.org/www-project-web-security-testing-guide/)
- [OSINT Framework](https://osintframework.com/)
- [MITRE ATT&CK: Reconnaissance](https://attack.mitre.org/tactics/TA0043/)
