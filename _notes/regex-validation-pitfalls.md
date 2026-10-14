---
title: "정규식 검증의 함정 (Regex Pitfalls)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Input Validation]
tags: [regex, redos, validation, web]
description: "앵커 누락·부분 일치·다중행 모드·단계적 치환 체인·ReDoS 등 정규식 검증이 깨지는 원리와, 우회 입력·DoS 구문을 정리합니다."
mermaid: true
---

> 정규식 검증은 "맞는 것만 통과"처럼 보이지만, 앵커 하나가 빠지거나 모드 하나가 잘못되면 **일부만 맞아도 통과**한다. 그리고 특정 패턴은 입력 하나로 서버를 멈추게 한다(ReDoS).

## 개념

정규식 기반 검증의 흔한 실수:

- **앵커 누락**: `^`/`$` 없이 `\d+`를 쓰면 `abc123def`도 "숫자가 있으니" 통과(부분 일치).
- **다중행 모드**: `$`가 각 줄 끝에 걸려, 개행 뒤 악성 내용을 숨길 수 있음.
- **블랙리스트 치환 체인**: 위험 문자열을 1회 치환하면 조각이 재조합됨.
- **ReDoS**: 중첩 수량자(`(a+)+`)가 특정 입력에서 지수 시간으로 폭발.

```python
re.match(r"\d+", user)        # match 는 '시작'만 봄 + $ 없음 → "123; DROP" 통과
re.search(r"^https?://", url) # search + ^ 만 → 뒤는 자유 (오픈 리다이렉트)
```

## 공격·우회 구문

허가된 범위에서만.

### 부분 일치·앵커 우회

```
앵커 없는 검증:  123' OR '1          (숫자 뒤에 페이로드)
^ 만 있고 $ 없음:  https://trusted.com@attacker.example
$ 만 있고 ^ 없음:  javascript:alert(1)//.png
match() 함정:  시작만 맞추고 뒤는 자유
```

### 다중행(MULTILINE) 우회

```
정상값\n<script>alert(1)</script>     # $ 가 줄 끝이면 2번째 줄 통과
개행(%0a)으로 검증 라인과 페이로드 라인 분리
```

### 치환 체인 재조합

```
scr<script>ipt  → ('script' 1회 삭제) → <script>
....//          → ('../' 삭제) → ../
```

### ReDoS (서비스 거부)

```
취약 패턴: (a+)+$  /  (.*a){20}  /  (\d+)*$  등 중첩 수량자
입력: "aaaa...aaaa!" (매칭 실패를 유도하는 긴 반복) → CPU 100%·응답 멈춤
→ 소량·테스트 환경에서 시간 증가만 확인하고 중단
```

### 확인 요령

```
정상값 '앞뒤'에 문자를 붙여 통과 여부가 바뀌는지(앵커 유무 판별)
개행 삽입으로 검증이 갈리는지
패턴에 중첩 수량자가 있으면 입력 길이를 조금씩 늘려 응답시간 비례 관찰
```

## 참고 자료

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP: Regular expression Denial of Service (ReDoS)](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [CWE-1333: Inefficient Regular Expression Complexity](https://cwe.mitre.org/data/definitions/1333.html)
