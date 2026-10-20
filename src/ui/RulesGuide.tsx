import { QuickState, objective } from "../game/quickGame";
import { newsAt } from "../game/information";
import { Modal } from "./Modal";

export function RulesGuide({
  game,
  onClose,
  introduction = false,
  notice,
}: {
  game: QuickState;
  onClose: () => void;
  introduction?: boolean;
  notice?: string;
}): JSX.Element {
  const mode = objective(game);
  return (
    <Modal titleId="guide-title" onClose={onClose} className="rules-guide">
      <span className="guide-eyebrow">СФЕРЫ ВЛИЯНИЯ · ПРАВИЛА ЗА МИНУТУ</span>
      <h2 id="guide-title" tabIndex={-1} data-autofocus>
        Пусть мир услышит вас
      </h2>
      <p className="guide-lead">
        Вы боретесь за внимание людей. Убеждайте города, развивайте редакции и
        берегите доверие.
      </p>
      {notice && (
        <p className="guide-notice" role="status">
          {notice}
        </p>
      )}
      <div className="guide-goal">
        <strong>Ваша цель</strong>
        <span>
          Лидировать в <b>{mode.goal} из 16 городов</b>, сохранить{" "}
          <b>не менее {mode.trust}% доверия</b> и удержать это{" "}
          <b>
            {mode.hold === 1 ? "один полный ход" : `${mode.hold} полных хода`}
          </b>
          .
        </span>
        <small>
          Успейте до конца {mode.limit}-го хода. Результат проверяется после
          ответов соперников.
        </small>
      </div>
      <ol className="guide-steps">
        <li>
          <span>1</span>
          <div>
            <h3>Выберите город</h3>
            <p>
              Нажмите на карту или переключите город стрелками в панели. Серые
              острова — независимые аудитории: их тоже можно убедить.
            </p>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <h3>Примите два решения</h3>
            <p>
              Можно действовать в одном городе или в разных. Рядом с каждой
              кнопкой видно, что изменится и сколько это стоит.
            </p>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <h3>Завершите ход</h3>
            <p>
              Соперники ответят, редакции принесут доход, начнётся новый ход.
              Анимацию ответов можно пропустить.
            </p>
          </div>
        </li>
      </ol>
      <div className="guide-actions">
        <article>
          <i>◈</i>
          <h3>Медиацентр</h3>
          <p>
            Стройте там, где лидируете. Он даёт доход, укрепляет поддержку и
            позволяет работать с более далёкими городами.
          </p>
        </article>
        <article>
          <i>⚑</i>
          <h3>Инфокампания</h3>
          <p>
            Увеличивает поддержку, но расходует доверие. Сравнивайте темы: важны
            интерес города и текущие новости. Повтор одной темы работает слабее.
          </p>
        </article>
        <article>
          <i>◇</i>
          <h3>Проверка фактов</h3>
          <p>
            Возвращает доверие, укрепляет поддержку и блокирует одну кампанию
            соперника. Полезна между кампаниями.
          </p>
        </article>
      </div>
      <details>
        <summary>Как получить лидерство и открыть новые города?</summary>
        <p>
          <strong>{newsAt(game.turn).title}.</strong> {newsAt(game.turn).text}
        </p>
        <p>
          Торговые узлы дают редакциям больше дохода, университеты помогают
          восстанавливать доверие, независимые редакции быстрее укрепляют
          поддержку. Особенность указана в карточке города.
        </p>
        <p>
          Ваша поддержка должна опережать каждую чужую на 5. На нейтральных
          островах нужно ещё не менее 55 поддержки. Политические границы
          сохраняются — меняется информационное влияние.
        </p>
        <p>
          Поддерживающий вас город открывает соседние аудитории, а редакция
          расширяет охват ещё на одну связь. Кнопка «Сеть» показывает эти связи
          на карте.
        </p>
        {game.difficulty !== "discovery" && (
          <p>С 9-го хода три работающие редакции дают третье решение за ход.</p>
        )}
      </details>
      <p className="guide-controls">
        WASD / стрелки — перемещение · колесо — масштаб · на телефоне: один
        палец — вращение, два — масштаб. Правила всегда доступны по кнопке «?».
      </p>
      <button className="guide-start" onClick={onClose}>
        {introduction ? "Начать игру →" : "Вернуться к карте"}
      </button>
    </Modal>
  );
}
