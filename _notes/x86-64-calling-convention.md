---
title: "x86-64 호출 규약과 레지스터 읽기"
date: 2026-10-15 09:00:00 +0900
categories: [Reversing, Static Analysis]
tags: [reversing, x86-64, calling-convention, assembly]
description: "인자 레지스터·함수 프롤로그·반환값 규칙을 알고 디스어셈블리에서 함수의 입출력을 추정하는 x86-64 호출 규약의 개념과 읽기 구문을 정리합니다."
mermaid: true
---

> 디스어셈블리를 읽는 첫걸음은 "이 함수가 무엇을 받아 무엇을 돌려주는가"다. 호출 규약을 알면 레지스터만 보고 인자와 반환값을 추정할 수 있다.

## 개념

호출 규약은 "인자를 어디에 두고 반환값을 어디로 받는가"의 약속이다. 대표적인 둘:

| | System V (Linux/macOS) | Microsoft x64 (Windows) |
|---|---|---|
| 정수 인자 1~6 | RDI, RSI, RDX, RCX, R8, R9 | RCX, RDX, R8, R9 (+스택) |
| 반환값 | RAX | RAX |
| 부동소수 인자 | XMM0~XMM7 | XMM0~XMM3 |
| 스택 정렬 | 16바이트 | 16바이트 + 32B shadow space |

호출 보존(callee-saved) 레지스터(RBX, RBP, R12~R15)는 함수가 바꾸면 복원해야 한다.

## 공격·분석 구문

허가된(자작·분석권한) 바이너리 기준.

### 프롤로그·에필로그로 함수 경계

```asm
push rbp
mov  rbp, rsp        ; 프롤로그 (프레임 설정)
sub  rsp, 0x30       ; 지역 변수 공간
...
leave / mov rsp,rbp ; pop rbp
ret                  ; 에필로그
```

### 인자·반환값 추정 (System V)

```asm
; func(a, b, c) 호출 측
mov edi, 1           ; 1번째 인자 a
mov esi, 2           ; 2번째 인자 b
mov edx, 3           ; 3번째 인자 c
call func
; 반환값은 rax/eax 에
cmp eax, 0           ; 반환값으로 분기 → 0/1 판정 함수일 가능성
```

### 래퍼·라이브러리 호출로 의미 추정

```asm
lea rdi, [rip+fmt]   ; "%s" 등 포맷 문자열 → printf 류
call strcmp          ; rdi/rsi 두 문자열 비교 → 그 결과로 분기 = 검증
call memcpy          ; rdi=dst, rsi=src, rdx=len
```

### 읽기 요령

```
먼저 호출 규약(OS·ABI) 확정 → 인자 레지스터 매핑
call 직전의 레지스터 세팅으로 인자 수·종류 추정
반환값(rax) 이 분기에 쓰이면 판정/검증 함수 후보 (→ 검증 루틴 읽기)
movzx/movsx 로 부호·크기 확장, 32비트 연산은 상위 32비트 0 클리어 유의
```

## 참고 자료

- [System V AMD64 ABI](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Ghidra (NSA)](https://github.com/NationalSecurityAgency/ghidra)
