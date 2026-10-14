---
title: "Python 객체 병합 오염 (Class Pollution)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Object Pollution]
tags: [python, prototype-pollution, merge, web]
description: "재귀 병합·setattr이 클래스 속성·전역까지 덮어쓰는 Python 객체 오염의 개념과(JS 프로토타입 오염 대응), __class__ 경유 주입 구문을 정리합니다."
mermaid: true
---

> JavaScript 프로토타입 오염의 Python 판본이다. 사용자 입력을 **재귀적으로 객체에 병합**하거나 `setattr`로 반영할 때, `__class__` 같은 특수 속성을 타고 올라가 클래스나 전역 설정을 덮어쓴다.

## 개념

`merge(obj, user_dict)`처럼 중첩 딕셔너리를 객체에 반영하는 코드가, 키 이름을 검증하지 않으면 `__class__`·`__init__`·`__globals__` 경로를 따라 **인스턴스 밖**의 속성을 바꾼다. 결과는 설정 변조, 다른 요청에 영향, 경우에 따라 코드 실행(gadget과 결합)이다.

```python
def merge(dst, src):
    for k, v in src.items():
        if isinstance(v, dict):
            merge(getattr(dst, k), v)      # __class__ 등으로 타고 올라감
        else:
            setattr(dst, k, v)             # 키 검증 없음
merge(user_obj, request.json)
```

## 공격·우회 구문

허가된 범위에서만.

### 특수 속성 경로 주입

```json
{"__class__": {"__init__": {"__globals__": {"CONFIG": "..."}}}}
{"__class__": {"__qualname__": "x"}}
```

병합이 `__class__`를 통과하면 인스턴스가 아니라 **클래스 속성**이 바뀌어 모든 인스턴스·이후 요청에 영향을 준다.

### 전역·설정 오염 (gadget)

```
클래스 기본값 변조: 다른 사용자에게도 적용되는 속성(권한 기본값 등)
전역 설정 접근: __globals__ 로 모듈 전역(비밀·플래그) 덮어쓰기
템플릿·직렬화 설정을 바꿔 2차 취약점(SSTI·역직렬화)으로 연결
```

### 확인 요령

```
JSON 본문에 __class__/__init__/__dict__ 키를 넣어 500·동작 변화 관찰
코드에서 재귀 merge·setattr·update(**user) 가 키를 검증 없이 쓰는지
오염 후 '새 요청·다른 객체'에 영향이 남는지(클래스 레벨 변조 신호)
```

## 참고 자료

- [OWASP Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)
- [CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes](https://cwe.mitre.org/data/definitions/915.html)
- [CWE-1321: Improperly Controlled Modification of Object Prototype Attributes (Prototype Pollution)](https://cwe.mitre.org/data/definitions/1321.html)
