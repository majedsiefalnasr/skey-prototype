import subprocess,sys,os,signal,time
seconds=int(sys.argv[1]);command=sys.argv[2:]
process=subprocess.Popen(command,start_new_session=True)
try:
 code=process.wait(timeout=seconds)
except subprocess.TimeoutExpired:
 print(f'BOUND EXCEEDED after {seconds}s: {command}',flush=True)
 os.killpg(process.pid,signal.SIGTERM)
 try:process.wait(timeout=10)
 except subprocess.TimeoutExpired:os.killpg(process.pid,signal.SIGKILL);process.wait()
 code=124
sys.exit(code)
