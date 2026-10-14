---
title: "모바일 디버거 탐지 우회와 디버깅 접속"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Anti-Tampering]
tags: [android, ios, anti-debug, ptrace, lldb, frida]
description: "ptrace·sysctl(P_TRACED)·TracerPid로 디버거를 탐지하는 모바일 안티디버그 로직과, 그 탐지를 끄고 원격 디버거(lldb/IDA)로 붙는 구문을 정리합니다."
mermaid: true
---

> 디버거를 붙이면 앱이 자신이 추적당하는지 감지해 종료하거나 `ptrace`로 추가 붙기를 막는다. 탐지 지점을 알면 반환을 뒤집거나 네이티브 `ptrace`를 무력화해 디버깅을 성립시킨다.

## 개념

플랫폼별 전형적인 탐지:

- **iOS – sysctl**: `sysctl(KERN_PROC)`로 현재 프로세스 정보를 읽어 `P_TRACED` 플래그를 본다. 추가로 `ptrace(PT_DENY_ATTACH)`를 걸어 디버거 붙기 자체를 거부한다. 탐지 스레드를 타이머로 계속 돌리는 구성이 흔하다.
- **Android – TracerPid**: `/proc/self/status`의 `TracerPid`가 0이 아니면 디버거 연결로 판단. 또한 **fork로 자식이 부모를 먼저 `ptrace`로 붙어** 외부 디버거의 attach를 선점하는 anti-debug 기법을 쓴다.
- **FLAG_DEBUGGABLE / isDebuggerConnected**: `ApplicationInfo` 플래그와 `Debug.isDebuggerConnected()`를 본다.

```c
// Android: TracerPid 체크
if (sscanf(line, "TracerPid: %d", &tpid), tpid != 0) return true;
```
```swift
// iOS: P_TRACED 체크
return (info.kp_proc.p_flag & P_TRACED) != 0
```

## 공격·우회 구문

허가된 대상에서만.

### Android 플래그·연결 체크 무력화 (Frida)

```javascript
Java.perform(function () {
  var CW = Java.use("android.content.ContextWrapper");
  var Debug = Java.use("android.os.Debug");
  var FLAG_DEBUGGABLE = 1 << 1;
  CW.getApplicationInfo.implementation = function () {
    var info = this.getApplicationInfo();
    info.flags.value &= ~FLAG_DEBUGGABLE;
    return info;
  };
  Debug.isDebuggerConnected.implementation = function () { return false; };
});
```

### 네이티브 ptrace 무력화

```javascript
// PT_DENY_ATTACH(iOS)/anti-ptrace 호출을 Interceptor 로 가로채 바로 리턴
Interceptor.replace(Module.findExportByName(null, "ptrace"),
  new NativeCallback(function () { return 0; }, 'int',
    ['int','int','pointer','int']));
```

### 원격 디버거 접속 (네이티브)

```bash
# Android: 단말에서 디버그 서버/gdbserver, 호스트에서 lldb
adb push android_server /data/local/tmp && adb shell chmod 777 /data/local/tmp/android_server
# IDA: debugger → remote ARM linux/Android, host 입력

./gdbserver :1337 --attach <pid>     # 단말
lldb                                  # 호스트
platform select remote-gdb-server
gdb-remote <device-ip>:1337
# gdbserver 종료 후에도 앱이 계속 돌면 탐지 미적용(취약)
```

## 참고 자료

- [OWASP MASTG: Anti-Debugging (Android/iOS)](https://mas.owasp.org/MASTG/techniques/)
- [OWASP MASVS: Resilience (MASVS-RESILIENCE)](https://mas.owasp.org/MASVS/09-MASVS-RESILIENCE/)
- [CWE-388: Error Handling Issues](https://cwe.mitre.org/data/definitions/388.html)
