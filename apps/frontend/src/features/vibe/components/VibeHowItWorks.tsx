"use client";

import { InfoHint } from "../../../shared/ui/InfoHint";

/**
 * The one thing the search cannot show by itself: that a phrase is read as
 * *both* "what kind of film" and "what it is about", and that those two halves
 * are combined with "and" rather than "or".
 *
 * It matters because the difference is visible in the results and invisible in
 * the interface — "жахи де є оголення" returning horror films with nothing
 * erotic in them looks like a broken search, not like a widened one.
 */
export function VibeHowItWorks() {
  return (
    <InfoHint title="Як працює пошук">
      <p className="info-hint__lead">
        Фраза розкладається на дві частини: <b>жанр</b> — який це фільм, і{" "}
        <b>теми</b> — про що він. Далі вони складаються через «і».
      </p>

      <div className="info-hint__example">
        <span className="info-hint__chip">жахи</span>
        <span className="info-hint__op">і</span>
        <span className="info-hint__chip">оголення</span>
        <span className="info-hint__op">→</span>
        <span className="info-hint__count">129 фільмів</span>
      </div>

      <dl className="info-hint__rules">
        <dt>Жанри — завжди «і»</dt>
        <dd>
          «Молодіжний жах» шукає фільм, який і жах, і молодіжний. Не той чи той.
        </dd>

        <dt>Теми — спершу теж «і»</dt>
        <dd>
          Спочатку шукаємо фільми, у яких є <i>усі</i> названі теми одразу — це
          найточніша відповідь на фразу.
        </dd>

        <dt>Якщо точних збігів мало — «або»</dt>
        <dd>
          Бібліотека тем розмічена нерівно, і часом фільму з усіма темами просто
          не існує. Тоді шукаємо ті, у яких є хоч одна, і пишемо про це під
          чипами: «точних збігів мало, показуємо ширше».
        </dd>
      </dl>

      <p className="info-hint__foot">
        Будь-який чіп можна прибрати або додати свій — запит перерахується
        миттєво й без AI.
      </p>
    </InfoHint>
  );
}
