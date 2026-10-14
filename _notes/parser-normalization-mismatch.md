---
title: "파서·정규화 불일치 (Parser Differential)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Input Validation]
tags: [normalization, parser-differential, filter-bypass, web]
description: "검증 코드와 실행 코드가 같은 입력을 다르게 해석할 때 생기는 필터 우회의 개념과, 대소문자·이중 디코딩·유니코드·중복 파라미터 우회 구문을 정리합니다."
mermaid: true
---

> 입력을 **검사하는 곳**과 **사용하는 곳**이 서로 다른 방식으로 문자열을 해석하면, 검사는 통과하고 사용은 위험해진다. 필터 우회의 상당수는 이 한 가지 원리로 설명된다.

## 개념

문자열은 거쳐 가는 단계마다 해석된다 — 대소문자 처리, 퍼센트 디코딩, 유니코드 정규화, 경로 정리, 공백·널 문자 처리가 단계마다 다를 수 있다. 검증 단계가 본 값과 최종 사용 단계가 본 값이 다르면 그 틈이 우회 지점이다.

```python
path = request.args["path"]      # 프레임워크가 이미 1회 디코딩
if "admin" in path:              # 1) 한 번 디코딩된 값을 검사
    abort(403)
real = unquote(path)             # 2) 여기서 또 디코딩 = 이중 디코딩
open_page(real)                  # 3) 두 번 디코딩된 값을 사용
```

핵심 질문은 하나다. **"검증한 변수와 실제로 쓰는 변수가 같은가, 그 사이에 값을 바꾸는 단계가 있는가."** 필터가 거부 방식인지 삭제 방식인지도 봐야 한다 — 삭제 후 남은 조각이 다시 위험한 값이 될 수 있다.

## 공격·우회 구문

평범한 값은 통과하고 위험해 보이는 값만 거부되는지로 필터 존재를 먼저 확인한 뒤, 검사가 어느 시점 문자열을 보는지 가설을 세워 응답 차이로 좁힌다.

### 대소문자·표기 변형

```
admin → Admin, ADMIN, aDmIn      # 검사가 대소문자 구분이면 우회
```

### 이중/다중 인코딩

검사 뒤에 한 번 더 디코딩되면 한 겹 더 인코딩한 값이 통과한다.

```
admin  →  %61dmin        # 1회 디코딩 검사 우회
       →  %2561dmin      # %25→% : 두 번째 디코딩에서 admin 복원
../    →  %2e%2e%2f  →  %252e%252e%252f
```

### 유니코드 정규화 (NFKC)

호환 문자가 정규화 후 ASCII로 접힌다.

```
ﬁle (U+FB01) → fi
＜ (U+FF1C 전각) → <
ⁿ·ſ 등 호환 문자로 키워드 재구성
```

### 널 바이트·비표준 공백

```
file.jsp%00.png          # %00 이 한쪽에선 문자열 끝
키워드%09/%0b/%0c 삽입    # 파서마다 공백 인정 범위가 다름
```

### 삭제형 치환 재조합

```
....//  → (../ 1회 삭제) → ../
scrscriptipt → (script 삭제) → script
```

### 중복 파라미터·구성요소 차이

프록시·WAF·앱이 같은 요청을 다르게 해석한다.

```
?id=1&id=2               # 어느 쪽을 쓰는지 (HPP)
경로 구분·중복 슬래시·비표준 표기를 각 계층이 다르게 봄
```

## 참고 자료

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [CWE-180: Validate Before Canonicalize](https://cwe.mitre.org/data/definitions/180.html)
- [CWE-174: Double Decoding of the Same Data](https://cwe.mitre.org/data/definitions/174.html)
