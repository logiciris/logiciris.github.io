---
title: "치환 테이블·블록 변환 읽기 (S-box)"
date: 2026-10-15 09:00:00 +0900
categories: [Reversing, Static Analysis]
tags: [reversing, sbox, block-cipher, crypto]
description: "자체 구현 암호의 S-box·라운드·키 혼합 구조를 디컴파일에서 식별하고, 가역 치환을 역테이블로 되돌리는 블록 변환 읽기의 개념과 구문을 정리합니다."
mermaid: true
---

> 자체 구현 "암호"는 대개 **치환 테이블(S-box) + 라운드 반복 + 키 혼합**의 조합이다. 각 부품의 생김새를 알면, 표준 알고리즘이 아니어도 구조를 분해해 역산할 수 있다.

## 개념

- **S-box(치환 테이블)**: `out = sbox[in]` 형태의 256바이트(또는 16/4비트) 배열. `.data`에 그대로 있고, 가역이면 **역테이블**로 되돌린다.
- **라운드**: 같은 변환을 여러 번 반복(루프 카운트가 라운드 수).
- **키 혼합**: 각 라운드에서 키·라운드 상수를 XOR/덧셈으로 섞음.
- **블록**: 고정 크기(8·16바이트) 단위로 처리(포인터 증가폭으로 식별).

```c
for (r = 0; r < ROUNDS; r++)
    for (i = 0; i < 16; i++)
        state[i] = sbox[state[i] ^ key[r][i]];   // 치환 + 키 혼합 + 라운드
```

## 공격·분석 구문

허가된(자작·CTF·분석권한) 대상 기준.

### 부품 식별

```
배열 인덱싱 out = tab[in]           → S-box (tab 크기 256 이면 바이트 치환)
이중 루프(라운드 × 블록)             → 라운드 구조
라운드마다 ^ key[r] / + rc[r]        → 키·라운드 상수 혼합
포인터 += 8/16, 길이 % 블록크기      → 블록 단위
알려진 상수(예: 0x63 등)로 표준(AES S-box) 여부 판별
```

### 역테이블 구성(가역 치환)

```python
# sbox 를 .data 에서 추출했다고 할 때
sbox = [...]                       # 256개
inv = [0]*256
for i,v in enumerate(sbox): inv[v] = i   # 역테이블
# 역변환: plain[i] = inv[cipher[i]] ^ key...  (순방향의 역순으로)
```

### 역산 전략

```
변환이 (치환 + XOR + 회전)처럼 '가역'이면 라운드 역순으로 되돌림
S-box 가 전단사(1:1)가 아니면 역불가 → 대입·제약 풀이(SAT/연립)로 전환
표준 알고리즘(AES/DES)로 식별되면 공개 구현·키로 복호
```

### 검증

```
역산 결과를 '순방향 구현'에 넣어 원본 암호문과 일치하는지 확인
라운드 수·엔디안·블록 경계가 한 군데만 틀려도 어긋남
```

## 참고 자료

- [Ghidra (NSA)](https://github.com/NationalSecurityAgency/ghidra)
- [CWE-327: Use of a Broken or Risky Cryptographic Algorithm](https://cwe.mitre.org/data/definitions/327.html)
- [CWE-656: Reliance on Security Through Obscurity](https://cwe.mitre.org/data/definitions/656.html)
