---
title: "OS 명령 주입 심화 (인자 주입·글롭)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Command Injection]
tags: [command-injection, argument-injection, glob, web]
description: "셸을 안 써도, 이스케이프해도 남는 명령 주입 — 인자(옵션) 주입·와일드카드 확장·블라인드 확인 구문을 입력이 들어가는 자리 중심으로 정리합니다."
mermaid: true
---

> 기본 개념은 [OS 명령어 주입](/notes/os-command-injection/)에서 다뤘다. 이 글은 **"셸을 안 써도, 이스케이프해도 왜 남는가"** 를 본다. 핵심은 "문자 막기"가 아니라 **입력이 명령의 어느 자리에 들어가는가**다.

## 개념

명령 실행에는 해석 층이 세 개 있고 층마다 방어가 다르다.

| 층 | 취약 형태 | 막는 법 |
|---|---|---|
| 1층 셸 | 문자열을 셸에 넘김 | 셸 없이 인자 배열로 실행 |
| 2층 인자 | 입력이 `-`로 시작해 옵션이 됨 | `--` 옵션 종료, 값 검증 |
| 3층 기능 | 프로그램의 위험 옵션 | 허용 옵션 고정, 권한 최소화 |

```python
cmd = f"tar -cf out.tar {shlex.quote(name)}"   # 1층(셸)은 막았지만
subprocess.run(cmd, shell=True)                # name 이 '-'로 시작하면 tar 옵션이 됨
```

`shlex.quote`는 셸 해석만 막는다. `name`이 `-`로 시작하면 tar 입장에선 파일이 아니라 **옵션**이다. 이것이 인자 주입(argument injection)이고, 변환기·이미지 도구·압축·`curl`류는 옵션 자체가 파일 접근·외부 통신·명령 실행 기능을 가진 경우가 많다.

## 공격·우회 구문

"실행 가능"을 무해한 명령 한 줄로 보이고 멈춘다. 허가된 범위에서만.

### 인자(옵션) 주입

정상 값 앞에 `-`를 붙여 옵션으로 해석되는지 본다. usage 메시지가 나오면 옵션으로 읽힌 증거다.

```
tar:   --checkpoint=1 --checkpoint-action=exec=sh\ shell.sh
       --use-compress-program=<명령>
curl:  -o /path/file  (임의 파일 쓰기) / -K <config> (설정 파일 읽기)
zip:   --unzip-command
find:  -exec <명령> ;
wget:  --output-document / --post-file (파일 유출)
```

### 글롭(와일드카드) 확장

`*`·`?`·`[ ]`는 **셸이** 파일 목록으로 확장한다. 업로드 파일명이 같은 디렉터리에 놓이면, 관리자의 `tar cf out.tar *` 에서 `-`로 시작하는 파일명이 **옵션으로 확장**된다.

```
업로드 파일명:  --checkpoint=1
               --checkpoint-action=exec=sh\x20payload.sh
→ `tar cf out.tar *` 실행 시 그 파일명이 옵션으로 확장
```

### 블라인드 확인 (출력 없음)

```
시간:   정상값 vs 지연 명령(대조군과 번갈아 2~3회 → 비례 관계)
외부:   내가 통제하는 서버로 이름조회/접속 유발 (비동기·큐 구조는 수 분 뒤 도착 — 대기 충분히)
오류:   존재하지 않는 대상 지정 → 상태코드·메시지 차이
부수효과: 정리 가능한 확인용 파일 생성 후 반드시 삭제·기록
```

## 참고 자료

- [OWASP OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [CWE-88: Argument Injection or Modification](https://cwe.mitre.org/data/definitions/88.html)
