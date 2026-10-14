---
title: "서버 사이드 템플릿 인젝션 (SSTI)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, SSTI]
tags: [ssti, template-injection, jinja2, web]
description: "사용자 입력이 템플릿 문자열 자체에 섞여 서버에서 표현식으로 평가되는 SSTI의 개념과, 엔진 탐지·식별·컨텍스트 접근 구문을 정리합니다."
mermaid: true
---

> 템플릿 엔진은 `{{ ... }}` 안을 **코드처럼 평가**한다. 사용자 입력이 템플릿 "데이터"가 아니라 템플릿 "문자열 자체"에 섞이면, 사용자는 서버 안에서 표현식을 실행하게 된다. 이것이 SSTI다.

## 개념

안전한 사용은 템플릿은 고정, 사용자 값은 변수로 넘기는 것이다. 취약한 사용은 사용자 값을 **템플릿 문자열을 만드는 재료**로 쓰는 것이다.

```python
@app.get("/hello")
def hello():
    name = request.args.get("name", "guest")
    page = f"<h1>Hello {name}</h1>"      # 입력이 템플릿 문자열에 들어감
    return render_template_string(page)  # 이 문자열이 템플릿으로 해석됨
```

`{{ 7*7 }}`을 넣어 `49`가 나오면 SSTI의 가장 단순한 징후다. 같은 사고가 `f-string`·`%`·`+`·`.format()` 어디서든 난다. XSS가 사용자 브라우저에서 해석되는 것과 달리 SSTI는 **서버**에서 평가되므로, 설정 객체(`config`)·내부 객체 접근, 경우에 따라 코드 실행까지 영향이 크다. 입력창뿐 아니라 404 경로, 오류 메시지, 이메일·알림 문구처럼 "서버가 문구를 만들어 주는 곳"에서 자주 나온다.

## 공격·우회 구문

영향 증명은 무해한 산술식으로 충분하다. 임의 코드 실행 시도는 허가 범위에서만 한다.

### 탐지 — 엔진별 구분자로 산술식

계산 결과가 출력되면 템플릿으로 평가되는 것이다.

```
{{7*7}}        → 49   (Jinja2, Twig)
${7*7}         → 49   (FreeMarker, JSP EL, Thymeleaf)
#{7*7}         → 49   (Ruby ERB 일부, JSF)
<%= 7*7 %>     → 49   (ERB, EJS)
{7*7}          → 49   (일부 엔진)
```

### 엔진 식별 (구분자 반응 차이)

```
{{7*'7'}}  → 7777777 (Jinja2)  /  49 (Twig)
${7*7} 는 되고 {{7*7}} 는 안 되면 → FreeMarker/EL 계열
문법 오류 입력에 나오는 스택 트레이스·오류 문구로 좁힘
```

### 컨텍스트 접근 (Jinja2 예)

설정값·내부 객체 노출 가능 여부까지만 확인한다.

```
{{ config }}
{{ config.items() }}
{{ self.__init__.__globals__ }}
```

## 참고 자료

- [OWASP WSTG: Testing for Server-side Template Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/18-Testing_for_Server-side_Template_Injection)
- [CWE-1336: Improper Neutralization of Special Elements Used in a Template Engine](https://cwe.mitre.org/data/definitions/1336.html)
- [Jinja 공식 문서: Sandbox](https://jinja.palletsprojects.com/en/stable/sandbox/)
