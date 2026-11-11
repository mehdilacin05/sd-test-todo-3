function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function confirmation(id: string, page: number) {
  const body = `<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Löschen bestätigen</title></head><body><dialog open aria-labelledby="confirm-title"><h1 id="confirm-title">Dieses Todo wirklich löschen?</h1><form action="/todos" method="post"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${escapeHtml(id)}"><input type="hidden" name="page" value="${page}"><button type="submit">Löschen bestätigen</button></form><p><a href="/?page=${page}">Abbrechen</a></p></dialog></body></html>`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function failure(status: number, message: string, text?: string) {
  const form =
    text === undefined
      ? ""
      : `<form action="/todos" method="post"><label for="text">Neues Todo</label><br><textarea id="text" name="text" rows="4">${escapeHtml(text)}</textarea><input type="hidden" name="action" value="create"><br><button type="submit">Anlegen</button></form>`;
  const body = `<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Todo</title></head><body><main><h1>Todo</h1><p role="alert">${escapeHtml(message)}</p>${form}<p><a href="/">Zur Liste</a></p></main></body></html>`;
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
