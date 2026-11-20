"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../shared/state/auth";
import { AuthModal } from "../../../widgets/AuthModal";
import { hydrateSavedWrites, useSavedWrites } from "../store/savedWrites";
import { retrySavedWrite } from "../api/savedApi";

export function SavedSyncNotice() {
  const { user, isLoading } = useAuth();
  const { writes, storageUnavailable } = useSavedWrites();
  const [loginOpen, setLoginOpen] = useState(false);
  useEffect(() => {
    hydrateSavedWrites();
  }, []);

  const own = writes.filter((entry) => entry.userId === user?.id);
  const pending = own.filter((entry) => entry.status === "pending");
  const failed = own.filter((entry) => entry.status === "error");

  useEffect(() => {
    if (!pending.length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending.length]);

  if (isLoading || (!own.length && (user || !writes.length))) return null;
  const needsLogin = !user;
  return (
    <>
      <aside
        className={`saved-sync-notice${failed.length || needsLogin ? " saved-sync-notice--error" : ""}`}
        aria-label="Стан збереження"
      >
        <div
          className="saved-sync-notice__heading"
          role={failed.length || needsLogin ? "alert" : "status"}
        >
          <span className="saved-sync-notice__icon" aria-hidden="true">
            {failed.length || needsLogin ? "!" : "↑"}
          </span>
          <div>
            <strong>
              {needsLogin
                ? "Увійди, щоб завершити збереження"
                : failed.length
                  ? `Не збережено змін: ${failed.length}`
                  : `Зберігаємо зміни: ${pending.length}`}
            </strong>
            <p>
              {storageUnavailable
                ? "Браузер не дозволив зберегти чернетку. Не оновлюй сторінку до завершення."
                : needsLogin
                  ? "Незавершені дії залишилися в цій вкладці. Увійди в той самий акаунт, щоб повторити їх."
                  : failed.length
                    ? "Ці зміни не підтверджені сервером. Вони залишаться тут після оновлення сторінки."
                    : "Чекаємо підтвердження сервера. Не закривай вкладку."}
            </p>
          </div>
        </div>
        {failed.length > 0 && (
          <ul className="saved-sync-notice__items">
            {failed.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{entry.title}</strong>
                  <p>
                    {entry.operation.kind === "remove"
                      ? "Видалення зі списку"
                      : entry.operation.kind === "stats"
                        ? "Оцінка або перегляди"
                        : "Додавання до списку"}{" "}
                    · {entry.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void retrySavedWrite(entry.id).catch(() => undefined);
                  }}
                  aria-label={`Повторити: ${entry.title}`}
                >
                  Повторити
                </button>
              </li>
            ))}
          </ul>
        )}
        {pending.length > 0 && failed.length > 0 && (
          <p role="status">Ще зберігається: {pending.length}</p>
        )}
        {needsLogin && (
          <button type="button" onClick={() => setLoginOpen(true)}>
            Увійти в акаунт
          </button>
        )}
      </aside>
      <AuthModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
