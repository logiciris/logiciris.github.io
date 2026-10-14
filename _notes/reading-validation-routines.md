---
title: "검증 루틴 읽기 (Reversing Input Checks)"
date: 2026-10-15 09:00:00 +0900
categories: [Reversing, Static Analysis]
tags: [reversing, static-analysis, ghidra, xor]
description: "문자열 교차참조로 입력 검증 함수를 찾고 XOR·비트 회전 같은 단순 변환을 역산하는 정적 분석의 개념과, 분석 순서·역연산 구문을 정리합니다."
mermaid: true
---

> 입력 검증이 클라이언트 바이너리 안에 있다면, 그 코드는 "숨겨진 비밀"이 아니라 **"읽을 수 있는 문서"** 다. 읽는 순서만 알면 된다.

## 개념

입력 검사 코드는 대부분 같은 모양이다 — 길이 검사 → 문자마다 변환 → 기준 배열과 비교 → 하나라도 틀리면 조기 반환(return 0).

```c
static const unsigned char target[8] = {0x1b,0x70,0xa5,0xf1,0xf1,0x87,0xd8,0x11};

int check(const char *in) {
    if (strlen(in) != 8) return 0;
    for (int i = 0; i < 8; i++) {
        unsigned char t = rol8((unsigned char)in[i] ^ 0x5a, i & 7);  // XOR 후 회전
        if (t != target[i]) return 0;
    }
    return 1;
}
```

분석자가 찾을 것은 셋이다. ① **성공·실패 메시지**(사람이 읽는 문자열 = 최고의 단서), ② **조기 반환**(틀리면 바로 0), ③ **기준 상수**(비교 배열·변환 키가 `.data`에 그대로).

## 공격·분석 구문

허가된 대상(자신이 만들었거나 분석 권한이 있는 바이너리)만.

### 문자열 → 교차참조로 판정 함수 찾기

```
Ghidra: Defined Strings 에서 "OK"/"NO"/"code:" 확인
"OK" 선택 → References(XREF) → main 의 puts 호출 도달 → 바로 위 check() 가 판정 함수
심볼이 지워져 FUN_00101234 여도 위치는 동일
```

### 디컴파일에서 읽어낼 것

```
len == 8           → 입력 길이 조건(후보 공간 축소)
^ 0x5a             → 고정 키 XOR
<<(i&7) | >>(8-..) → 비트 회전(ROL), 회전폭 = 인덱스 하위 3비트
DAT_00102010[i]    → 기준 상수 배열 (.data 에서 8바이트 그대로)
return 0 다수       → 조기 반환 구조
```

### 어셈블리 대조 (디컴파일 오류 방지)

```asm
movzx eax,byte [rdi+rsi]   ; 입력 i번째
xor   eax,0x5a             ; 고정 키 XOR
and   ecx,7                ; 회전폭 i&7
rol   al,cl                ; 8비트 회전 (최적화 시 shift 2개+OR 로 풀릴 수 있음)
cmp   al,byte [rdx+rsi]    ; 기준 배열 비교
jne   fail
```

### 가역 변환 역산

가역 연산만이면 기준 상수에서 입력을 거꾸로 계산한다. 합성 변환은 **역순**으로 — 여기선 "XOR 후 ROL" → 역은 "ROR 후 XOR".

```python
target = [0x1b,0x70,0xa5,0xf1,0xf1,0x87,0xd8,0x11]
ror = lambda v,n: ((v>>n)|(v<<(8-n))) & 0xFF
print(bytes(ror(t, i&7) ^ 0x5a for i,t in enumerate(target)))
# x^k ↔ x^k,  ROL(x,n) ↔ ROR(x,n),  x+k ↔ x-k
# 해시 비교면 일방향 → 역산 불가 (대입/수집 경로로 전환)
```

역산 결과는 반드시 **순방향 코드에 다시 넣어** 통과하는지 확인한다(부호확장·8비트 절단·회전폭 해석이 한 군데만 틀려도 어긋남).

## 참고 자료

- [Ghidra (NSA)](https://github.com/NationalSecurityAgency/ghidra)
- [CWE-602: Client-Side Enforcement of Server-Side Security](https://cwe.mitre.org/data/definitions/602.html)
- [CWE-656: Reliance on Security Through Obscurity](https://cwe.mitre.org/data/definitions/656.html)
