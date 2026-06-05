### 3. PowerShell Push Syntax
When pushing updates, **never** use `&&` (bash syntax). Use `;` for PowerShell chaining:

- **Don't:** `git add . && git commit -m "msg" && git push`
- **Do:** `git add . ; git commit -m "msg" ; git push -u origin [branch-name]`