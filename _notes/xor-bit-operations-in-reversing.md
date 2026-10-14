---
title: "역공학의 비트 연산 (XOR·시프트·회전)"
date: 2026-10-15 09:00:00 +0900
categories: [Reversing, Static Analysis]
tags: [reversing, xor, bit-operation, ghidra]
description: "디컴파일 결과에서 자주 보이는 XOR·마스크·시프트·회전·바이트 스왑을 알아보고 가역 변환을 역산하는 개념과, 역연산 구문을 정리합니다."
mermaid: true
---

> 간단한 검증·인코딩 루틴은 대부분 **XOR·시프트·회전·덧셈**의 조합이다. 각 연산의 생김새와 역연산만 알면, 기준 상수에서 입력을 거꾸로 계산할 수 있다.

## 개념

이 연산들은 **가역(되돌릴 수 있는)** 이라, 순방향을 읽으면 역방향으로 답을 구할 수 있다. 합성 변환은 **마지막에 적용된 것부터** 역순으로 푼다.

| 연산 | 역연산 | 이유 |
|---|---|---|
| `x ^ k` | `x ^ k` | 같은 값을 한 번 더 XOR하면 복원 |
| `ROL(x,n)` | `ROR(x,n)` | 밀려난 비트를 반대편에서 되돌림 |
| `x + k` (8비트) | `x - k` (mod 256) | 모듈러 덧셈 |
| 니블 스왑 | 니블 스왑 | 상·하위 4비트 교환은 자기역 |
| `x ^ (x>>n)` 류 | 단계적 복원 | 선형이라 역추적 가능 |

해시(일방향)만 아니면 거의 되돌린다. 회전은 디컴파일에서 **시프트 두 개와 OR**로 풀려 보일 수 있다 — 같은 의미임을 알아보는 것이 읽기의 절반이다.

## 공격·분석 구문

허가된(자작·분석권한) 바이너리 기준.

### 디컴파일에서 연산 알아보기

```c
b ^ 0x5a                          // 고정 키 XOR
(b << n) | (b >> (8 - n))         // ROL n  (반대면 ROR)
((b & 0x0f) << 4) | (b >> 4)      // 니블 스왑
b & 0xff                          // 8비트 절단(래핑)
b + 0x20 ... & 0xff               // 모듈러 덧셈
```

### 어셈블리 신호

```asm
xor al, 0x5a        ; 고정 키 XOR
rol al, cl          ; 회전 (cl = 회전폭) — 최적화 시 shl/shr+or 로 풀림
movzx eax, al       ; 부호 없는 8비트 확장 (부호확장 movsx 와 구분)
and eax, 0xff       ; 8비트 마스크
```

### 역산 (XOR 후 ROL 예)

순방향이 "XOR → ROL"이면 역은 "ROR → XOR"(역순).

```python
target = [0x1b,0x70,0xa5,0xf1,0xf1,0x87,0xd8,0x11]
ror  = lambda v,n: ((v>>n)|(v<<(8-n))) & 0xFF
rol  = lambda v,n: ((v<<n)|(v>>(8-n))) & 0xFF
plain = [ror(t, i & 7) ^ 0x5a for i,t in enumerate(target)]   # 역순: ROR 먼저, 그다음 XOR
print(bytes(plain))
# 검증: 순방향 재적용 → target 과 일치해야 함
assert [rol(p ^ 0x5a, i & 7) for i,p in enumerate(plain)] == target
```

역산 결과는 **반드시 순방향에 다시 넣어** 일치하는지 확인한다(부호확장·8비트 절단·회전폭 해석이 한 군데만 틀려도 어긋난다).

## 참고 자료

- [Ghidra (NSA)](https://github.com/NationalSecurityAgency/ghidra)
- [CWE-656: Reliance on Security Through Obscurity](https://cwe.mitre.org/data/definitions/656.html)
- [CWE-327: Use of a Broken or Risky Cryptographic Algorithm](https://cwe.mitre.org/data/definitions/327.html)
