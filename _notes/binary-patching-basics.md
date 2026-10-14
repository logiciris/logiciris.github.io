---
title: "바이너리 패치 기초 (Binary Patching)"
date: 2026-10-15 09:00:00 +0900
categories: [Reversing, Static Analysis]
tags: [reversing, patching, assembly]
description: "분기 변경·NOP 채우기·조건 반전으로 바이너리 동작을 바꾸는 패치의 개념과, 분기 명령 식별·바이트 교체·크기 맞춤 구문을 정리합니다."
mermaid: true
---

> 검증 함수의 흐름을 이해했다면, 때로는 **분기 한 줄**만 바꿔 동작을 바꿀 수 있다. 바이너리 패치는 실행 파일의 기계어 몇 바이트를 교체하는 작업이다.

## 개념

판정은 보통 "비교 → 조건 분기"로 되어 있다. 그 분기를 반대로 바꾸거나(`jne`↔`je`), 항상 참으로 만들거나(`jmp`), 검증 호출을 건너뛰면(NOP) 흐름이 바뀐다. 핵심은 **교체 바이트 수를 원래와 똑같이** 맞추는 것(크기가 다르면 뒤 명령이 깨진다). 자작/분석권한 바이너리에서만.

```asm
cmp eax, 0
jne fail        ; 이 분기를 je 로 바꾸거나 NOP 로 지우면 fail 을 건너뜀
```

## 공격·분석 구문

허가된(자작·CTF·분석권한) 바이너리 기준.

### 분기 명령·바이트

```
je/jz   74 xx     jne/jnz 75 xx      ; 조건 반전: 74↔75
jmp(short) EB xx  jmp(near) E9 ....   ; 무조건 분기로
NOP     90        ; 명령 1바이트 채움(여러 개로 긴 명령 제거)
test eax,eax / cmp 뒤 분기가 판정의 핵심
```

### 전형적 패치

```
조건 반전: jne(75) → je(74)   # "틀리면 실패"를 "맞으면 실패"로 뒤집어 역이용
항상 통과: 분기를 NOP 로 지워 성공 경로로 진행
검증 생략: call check 를 NOP(E8+4바이트 = 90 x5) 로, 또는 반환을 mov eax,1; ret 로
```

### 작업 순서

```
1) 디스어셈블러(Ghidra/objdump)로 판정 분기의 '파일 오프셋' 확인
2) 헥스 에디터로 그 오프셋의 바이트를 같은 길이로 교체
3) 길이 불일치면 NOP(90)로 패딩해 뒤 명령 정렬 유지
4) 재실행으로 동작 확인 (체크섬·안티탬퍼가 있으면 그 검사도 처리)
objdump -d / rizin: wa(assemble) / radare2 패치 모드(-w)
```

### 주의

```
서명·체크섬·런타임 무결성 검사가 있으면 패치가 탐지·거부됨 → 그 검사 위치도 분석
```

## 참고 자료

- [Ghidra (NSA)](https://github.com/NationalSecurityAgency/ghidra)
- [radare2 / rizin](https://rizin.re/)
- [CWE-602: Client-Side Enforcement of Server-Side Security](https://cwe.mitre.org/data/definitions/602.html)
