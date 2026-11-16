import { getDb, nowIso } from './client';
import { DEFAULT_HERO_BACKGROUND_PROMPT } from '@/lib/hero-background-prompt';
import { releasedIssueSql } from '@/lib/embargo';
import { HERO_PLACEMENT_DEFAULTS, resolveHeroPlacement, type HeroDevice, type HeroPlacement, type HeroPlacements } from '@/lib/hero-placement';

export type HeroArtworkSlot = 'desktop' | 'mobile';
export interface HeroArtworkRecord { key: string; width: number; height: number; hash: string; theme: string; }

export interface HeroArtworkInventoryRecord {
  issueId: string;
  desktop: HeroArtworkRecord | null;
  mobile: HeroArtworkRecord | null;
}

export async function readDirectHeroPresentation(issueId: string): Promise<{ desktop: HeroArtworkRecord | null; mobile: HeroArtworkRecord | null }> {
  const { rows } = await getDb().execute({ sql: 'SELECT * FROM issue_hero_presentations WHERE issue_id=?', args: [issueId] });
  const row = rows[0];
  const slot = (name: HeroArtworkSlot): HeroArtworkRecord | null => {
    const key = row?.[`${name}_key`];
    return typeof key === 'string' ? { key, width: Number(row[`${name}_width`]), height: Number(row[`${name}_height`]), hash: String(row[`${name}_hash`]), theme: String(row[`${name}_theme_json`] ?? '{}') } : null;
  };
  return { desktop: slot('desktop'), mobile: slot('mobile') };
}

export async function readHeroPresentation(issueId: string): Promise<{ desktop: HeroArtworkRecord | null; mobile: HeroArtworkRecord | null }> {
  const direct = await readDirectHeroPresentation(issueId);
  let desktop = direct.desktop;
  let mobile = direct.mobile;

  // If this issue does not have custom hero artwork, inherit from
  // another issue published in the exact same year and month (e.g. Hindi Agnishikha
  // sharing the monthly hero artwork updated for English All India Magazine).
  if (!desktop || !mobile) {
    const { rows } = await getDb().execute({
      sql: `SELECT p.* FROM issue_hero_presentations p
            JOIN issues target ON target.id = ?
            JOIN issues sibling ON sibling.id = p.issue_id AND sibling.year = target.year AND sibling.month = target.month AND sibling.id != target.id
            ORDER BY (p.desktop_key IS NOT NULL AND p.mobile_key IS NOT NULL) DESC, p.updated_at DESC
            LIMIT 1`,
      args: [issueId],
    });
    const sRow = rows[0];
    if (sRow) {
      if (!desktop && typeof sRow.desktop_key === 'string') {
        desktop = {
          key: String(sRow.desktop_key),
          width: Number(sRow.desktop_width),
          height: Number(sRow.desktop_height),
          hash: String(sRow.desktop_hash),
          theme: String(sRow.desktop_theme_json ?? '{}'),
        };
      }
      if (!mobile && typeof sRow.mobile_key === 'string') {
        mobile = {
          key: String(sRow.mobile_key),
          width: Number(sRow.mobile_width),
          height: Number(sRow.mobile_height),
          hash: String(sRow.mobile_hash),
          theme: String(sRow.mobile_theme_json ?? '{}'),
        };
      }
    }
  }

  return { desktop, mobile };
}

export async function listReleasedReadyHeroIssueIds(): Promise<string[]> {
  const { rows } = await getDb().execute(`
    SELECT DISTINCT i.id AS issue_id
    FROM issues i
    JOIN issues sibling ON sibling.year = i.year AND sibling.month = i.month
    JOIN issue_hero_presentations p ON p.issue_id = sibling.id
    WHERE p.desktop_key IS NOT NULL AND p.mobile_key IS NOT NULL AND ${releasedIssueSql('i')}
    ORDER BY i.year DESC, i.month DESC, i.magazine_id ASC
  `);
  return rows.map((row) => String(row.issue_id));
}

export async function listHeroArtworkInventory(): Promise<HeroArtworkInventoryRecord[]> {
  const { rows } = await getDb().execute(
    'SELECT * FROM issue_hero_presentations WHERE desktop_key IS NOT NULL OR mobile_key IS NOT NULL ORDER BY updated_at DESC',
  );
  return rows.map((row) => {
    const artwork = (slot: HeroArtworkSlot): HeroArtworkRecord | null => {
      const key = row[`${slot}_key`];
      return typeof key === 'string'
        ? {
            key,
            width: Number(row[`${slot}_width`]),
            height: Number(row[`${slot}_height`]),
            hash: String(row[`${slot}_hash`]),
            theme: String(row[`${slot}_theme_json`] ?? '{}'),
          }
        : null;
    };
    return { issueId: String(row.issue_id), desktop: artwork('desktop'), mobile: artwork('mobile') };
  });
}

export async function saveHeroArtwork(issueId: string, slot: HeroArtworkSlot, artwork: HeroArtworkRecord, adminId: string): Promise<string | null> {
  const previous = await readDirectHeroPresentation(issueId);
  const prefix = slot === 'desktop' ? 'desktop' : 'mobile';
  await getDb().execute({
    sql: `INSERT INTO issue_hero_presentations(issue_id,${prefix}_key,${prefix}_width,${prefix}_height,${prefix}_hash,${prefix}_theme_json,updated_by,updated_at)
          VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(issue_id) DO UPDATE SET
          ${prefix}_key=excluded.${prefix}_key,${prefix}_width=excluded.${prefix}_width,${prefix}_height=excluded.${prefix}_height,
          ${prefix}_hash=excluded.${prefix}_hash,${prefix}_theme_json=excluded.${prefix}_theme_json,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
    args: [issueId, artwork.key, artwork.width, artwork.height, artwork.hash, artwork.theme, adminId, nowIso()],
  });
  return previous[slot]?.key ?? null;
}

export async function removeHeroArtwork(issueId: string, slot: HeroArtworkSlot, adminId: string): Promise<string | null> {
  const previous = await readDirectHeroPresentation(issueId);
  const prefix = slot === 'desktop' ? 'desktop' : 'mobile';
  await getDb().execute({ sql: `UPDATE issue_hero_presentations SET ${prefix}_key=NULL,${prefix}_width=NULL,${prefix}_height=NULL,${prefix}_hash=NULL,${prefix}_theme_json=NULL,updated_by=?,updated_at=? WHERE issue_id=?`, args: [adminId, nowIso(), issueId] });
  return previous[slot]?.key ?? null;
}

export async function saveHeroArtworkTheme(issueId: string, slot: HeroArtworkSlot, theme: string, adminId: string): Promise<boolean> {
  const prefix = slot === 'desktop' ? 'desktop' : 'mobile';
  const result = await getDb().execute({
    sql: `UPDATE issue_hero_presentations SET ${prefix}_theme_json=?,updated_by=?,updated_at=? WHERE issue_id=? AND ${prefix}_key IS NOT NULL`,
    args: [theme, adminId, nowIso(), issueId],
  });
  return result.rowsAffected > 0;
}

const HERO_PLACEMENT_SETTING_KEY='hero_scene_placements';

export async function readGlobalHeroPlacements():Promise<HeroPlacements>{
  const {rows}=await getDb().execute({sql:'SELECT value FROM site_settings WHERE key=?',args:[HERO_PLACEMENT_SETTING_KEY]});
  if(!rows[0]){
    const legacy=await getDb().execute('SELECT desktop_theme_json,mobile_theme_json FROM issue_hero_presentations ORDER BY updated_at DESC');
    const recovered:Partial<Record<HeroDevice,Partial<HeroPlacement>>>={};
    for(const row of legacy.rows){
      for(const [column,devices] of [['desktop_theme_json',['desktop','tablet']],['mobile_theme_json',['phone']]] as const){
        try{const layout=JSON.parse(String(row[column]??'{}')).layout as Partial<Record<HeroDevice,Partial<HeroPlacement>>>|undefined;for(const device of devices){if(!recovered[device]&&layout?.[device])recovered[device]=layout[device];}}catch{continue;}
      }
    }
    return {desktop:resolveHeroPlacement(recovered,'desktop'),tablet:resolveHeroPlacement(recovered,'tablet'),phone:resolveHeroPlacement(recovered,'phone')};
  }
  try{
    const parsed=JSON.parse(String(rows[0]?.value??'{}')) as Partial<Record<HeroDevice,Partial<HeroPlacement>>>;
    return {
      desktop:resolveHeroPlacement(parsed,'desktop'),
      tablet:resolveHeroPlacement(parsed,'tablet'),
      phone:resolveHeroPlacement(parsed,'phone'),
    };
  }catch{return structuredClone(HERO_PLACEMENT_DEFAULTS);}
}

export async function saveGlobalHeroPlacement(device:HeroDevice,placement:HeroPlacement,adminId:string):Promise<HeroPlacements>{
  const current=await readGlobalHeroPlacements();
  const next={...current,[device]:placement};
  await getDb().execute({
    sql:`INSERT INTO site_settings(key,value,description,updated_by,updated_at) VALUES(?,?,?,?,?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value,description=excluded.description,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
    args:[HERO_PLACEMENT_SETTING_KEY,JSON.stringify(next),'Global desktop, tablet and phone hero scene placement',adminId,nowIso()],
  });
  return next;
}

export interface HeroPromptTemplate {
  text: string;
  revision: number;
  updatedBy: string | null;
  updatedAt: string | null;
}

export async function readHeroPromptTemplate(): Promise<HeroPromptTemplate> {
  const result = await getDb().execute({
    sql: 'SELECT template_text, revision, updated_by, updated_at FROM hero_prompt_templates WHERE id = ?',
    args: ['master'],
  });
  const row = result.rows[0];
  return row ? {
    text: String(row.template_text), revision: Number(row.revision),
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  } : { text: DEFAULT_HERO_BACKGROUND_PROMPT, revision: 0, updatedBy: null, updatedAt: null };
}

export async function saveHeroPromptTemplate(text: string, expectedRevision: number, adminId: string): Promise<HeroPromptTemplate | null> {
  const now = nowIso();
  if (expectedRevision === 0) {
    const result = await getDb().execute({
      sql: `INSERT INTO hero_prompt_templates(id,template_text,revision,updated_by,updated_at)
            VALUES('master',?,1,?,?) ON CONFLICT(id) DO NOTHING`, args: [text, adminId, now],
    });
    if (!result.rowsAffected) return null;
  } else {
    const result = await getDb().execute({
      sql: `UPDATE hero_prompt_templates SET template_text=?,revision=revision+1,updated_by=?,updated_at=?
            WHERE id='master' AND revision=?`, args: [text, adminId, now, expectedRevision],
    });
    if (!result.rowsAffected) return null;
  }
  return readHeroPromptTemplate();
}
