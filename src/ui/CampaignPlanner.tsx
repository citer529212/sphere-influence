import { campaignError, mediaReach, objective, type QuickState } from "../game/quickGame";
import { TOPICS } from "../game/information";
import {
  CHANNELS,
  DOCTRINES,
  forecastCampaignStage,
  type CampaignStage,
  type CampaignChannel,
} from "../game/campaigns";
import { REALMS } from "../game/realms";

const assessmentText = {
  delivered: "Этап выполнен.",
  reach: "Этап сорван из-за потери охвата. Восстановите связь с редакциями.",
  shield: "Проверка фактов соперника сдержала этап. Щит израсходован.",
  backlash: "Вирусный эфир вызвал откат. Проверьте доверие и усталость перед новым запуском.",
};
const signed = (value: number) => value > 0 ? `+${value}` : String(value);

function LastAssessment({ game }: { game: QuickState }) {
  const report = game.lastCampaignAssessment;
  if (!report) return null;
  const city = game.regions.find(region => region.id === report.regionId);
  return (
    <details className="active-media-campaign campaign-assessment">
      <summary>Разбор этапа · ход {report.turn} · {city?.name}</summary>
      <p><strong>{CHANNELS[report.channel].name} · этап {report.stage}/{CHANNELS[report.channel].duration}</strong> · {TOPICS[report.topic].name}</p>
      <p>{assessmentText[report.outcome]}</p>
      <p>
        Поддержка в городе {signed(report.supportDelta)} п. п. · доверие {signed(report.trustDelta)} п. п. · усталость {signed(report.fatigueDelta)} п. п.
        {report.spilloverCities > 0 && ` · соседних аудиторий с ростом поддержки: ${report.spilloverCities}`}
        {report.shieldGranted && " · установлен щит"}
      </p>
    </details>
  );
}

function StageForecast({ game, campaign }: { game: QuickState; campaign: CampaignStage }) {
  const forecast = forecastCampaignStage(game, campaign, mediaReach);
  if (!forecast) return null;

  const { blocked, shield, backlash, gain, region } = forecast;
  if (blocked === "reach") {
    return <p className="campaign-risk">Охват потерян. Восстановите связь с редакциями, иначе этап будет сорван.</p>;
  }
  if (shield) {
    return <p className="campaign-risk">Щит державы «{REALMS[shield].name}» может погасить этап целиком.</p>;
  }

  const support = region.influence[campaign.actor];
  const trust = campaign.actor === game.player ? game.trust : game.rivalTrust[campaign.actor];
  return (
    <p className={backlash ? "campaign-risk" : undefined}>
      Поддержка {support}% → {support + gain}%.
      {backlash && ` Откат. Доверие ${trust}% → ${Math.max(0, trust - 3)}%.`}
      {backlash && trust < 45 && ` Доверие ${trust}%, нужно от 45%.`}
      {backlash && region.fatigue >= 60 && ` Усталость ${region.fatigue}%, нужно ниже 60%.`}
      {backlash && " Поможет проверка фактов."}
    </p>
  );
}

export default function CampaignPlanner({
  game,
  regionId,
  onLaunch,
}: {
  game: QuickState;
  regionId: string;
  onLaunch: (channel: CampaignChannel) => void;
}) {
  const current = game.activeCampaigns?.find((campaign) => campaign.actor === game.player);
  const doctrine = DOCTRINES[game.player];
  return (
    <section className="campaign-planner">
      <p className="doctrine-note"><b>{doctrine.name}.</b> {doctrine.bonus}</p>
      {!game.result && <p className="doctrine-note">Прогноз по текущей обстановке. Ответные ходы могут изменить эффект.</p>}
      {!current && !game.result && <p className="doctrine-note">Тема запуска: <b>{TOPICS[game.topic].name}</b>.</p>}
      <LastAssessment game={game} />
      {current ? (
        <article className="active-media-campaign">
          <strong>{CHANNELS[current.channel].name} · {game.regions.find((region) => region.id === current.regionId)?.name}</strong>
          <p>Тема зафиксирована: {TOPICS[current.topic].name}. Новые акции могут использовать другую тему.</p>
          <p>Завершено этапов: {current.stage}/{CHANNELS[current.channel].duration}.{!game.result && " Следующий — после ответных действий."}</p>
          <progress value={current.stage} max={CHANNELS[current.channel].duration} aria-label="Этапы текущей кампании" />
          {!game.result && <StageForecast game={game} campaign={current} />}
          {!game.result && <p>Одна активная кампания на державу. Пока она идёт, проводите акции и операции.</p>}
        </article>
      ) : (
        <div className="campaign-options">
          {(Object.keys(CHANNELS) as CampaignChannel[]).map((channel) => {
            const details = CHANNELS[channel];
            const specialized = channel === doctrine.channel;
            const error = campaignError(game, regionId, channel);
            return (
              <article key={channel} className={specialized ? "doctrine-match" : undefined}>
                <h4>{details.name}{specialized && " · ваша специализация"}</h4>
                <p>{details.medium}</p>
                {!game.result && <StageForecast game={game} campaign={{
                  actor: game.player,
                  regionId,
                  channel,
                  topic: game.topic,
                  stage: 0,
                }} />}
                <details>
                  <summary>Этапов: {details.duration} · средства и риски</summary>
                  <p>{details.rule}</p>
                </details>
                {!game.result && game.turn + details.duration - 1 > objective(game).limit &&
                  <p className="campaign-risk">До лимита не все этапы успеют пройти.</p>}
                <button disabled={!!error} onClick={() => onLaunch(channel)}>
                  {error ?? `Запустить · ${details.cost} ◈ · 1 решение`}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
