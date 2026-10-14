---
title: "모바일 메모리 내 민감정보 노출"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Storage]
tags: [android, ios, memory-dump, fridump, credentials]
description: "실행 중 프로세스 메모리를 덤프해 비밀번호·토큰이 평문으로 남는지 보는 점검의 원리와, 응답 JSON으로 비밀번호가 다시 메모리에 남는 함정을 정리합니다."
mermaid: true
---

> 입력 직후엔 지웠더라도, 비밀번호·토큰이 처리 과정에서 메모리에 평문으로 남을 수 있다. 실행 중 프로세스 메모리를 덤프해 비밀값 패턴을 찾으면 노출 여부가 드러난다.

## 개념

- **메모리 덤프 점검**: 탈옥/루팅 단말에서 실행 중 앱의 메모리를 여러 번 덤프(실행마다 결과가 조금씩 달라져 반복 필요)한 뒤, 비밀값 패턴을 grep한다.
- **흔한 함정 – 응답값 재유입**: 화면 입력단에서 비밀번호를 지워도, **서버가 응답 JSON에 비밀번호를 다시 담아 보내면** 그 값이 다시 메모리에 남는다. 조치 후에도 메모리에 남는다면 응답 본문에 비밀번호가 들어오는지 확인해야 한다.
- **올바른 처리의 모습**: `char[]`로 받아 사용 직후 `Arrays.fill`로 덮고, `WeakReference`로 참조를 끊고, GC를 유도. iOS는 키체인 키로 AES 암호화해 들고 다니는 식. 이런 처리가 없으면 노출 가능성이 크다.

## 공격·확인 구문

허가된 단말에서만. `<secret>`은 찾을 비밀값 패턴.

### 메모리 덤프 (fridump)

```bash
python fridump3.py -u -r <pid> -s
# 멈추면 sudo 로 재시도 / 백신 실시간 탐지 끄기 / 다른 단말로 재시도
grep -rinoE '<secret>' dump/
```

### 확인 관점

```
입력 지운 뒤에도 비밀번호가 메모리에 남는가
→ 서버 응답 JSON 에 비밀번호/토큰이 포함되는지 확인
토큰·세션키가 장시간 평문으로 상주하는가
```

### 안전 처리의 흔적(있으면 양호)

```java
Arrays.fill(passwordChar, 0x20.toChar()); // 사용 후 덮기
weakPassword.clear();                      // 참조 해제
System.gc();                               // 회수 유도
```

## 참고 자료

- [fridump3](https://github.com/rootbsd/fridump3)
- [OWASP MASTG: Testing Memory for Sensitive Data](https://mas.owasp.org/MASTG/techniques/)
- [CWE-316: Cleartext Storage of Sensitive Information in Memory](https://cwe.mitre.org/data/definitions/316.html)
