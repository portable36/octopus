import { Migration } from '@mikro-orm/migrations';

/** CMS Pages P1: content_pages + content_page_publications with platform RLS. */
export class Migration20260918100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "content_pages" (
        "id" uuid primary key,
        "title" varchar(200) not null,
        "slug" varchar(200) not null,
        "status" varchar(32) not null,
        "draft_body" jsonb not null default '[]'::jsonb,
        "draft_seo" jsonb not null default '{}'::jsonb,
        "version" int not null,
        "current_publication_id" uuid null,
        "archived_at" timestamptz null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        "created_by" uuid null,
        "updated_by" uuid null,
        constraint content_pages_status_chk
          check (status in ('DRAFT', 'PUBLISHED', 'UNPUBLISHED')),
        constraint content_pages_version_chk check (version >= 1)
      );
    `);

    this.addSql(`
      create unique index if not exists "content_pages_slug_active_uq"
        on "content_pages" ("slug")
        where "archived_at" is null;
    `);
    this.addSql(`
      create index if not exists "content_pages_status_updated_idx"
        on "content_pages" ("status", "updated_at" desc);
    `);

    this.addSql(`
      create table if not exists "content_page_publications" (
        "id" uuid primary key,
        "page_id" uuid not null references "content_pages" ("id"),
        "title" varchar(200) not null,
        "slug" varchar(200) not null,
        "body" jsonb not null,
        "seo" jsonb not null default '{}'::jsonb,
        "page_version" int not null,
        "published_at" timestamptz not null,
        "published_by" uuid null,
        "source_publication_id" uuid null
      );
    `);

    this.addSql(`
      create index if not exists "content_page_publications_slug_published_idx"
        on "content_page_publications" ("slug", "published_at" desc);
    `);
    this.addSql(`
      create index if not exists "content_page_publications_page_published_idx"
        on "content_page_publications" ("page_id", "published_at" desc);
    `);

    this.addSql(`
      alter table "content_pages"
        add constraint content_pages_current_publication_fk
        foreign key ("current_publication_id")
        references "content_page_publications" ("id");
    `);

    this.addSql(`alter table "content_pages" enable row level security;`);
    this.addSql(`alter table "content_pages" force row level security;`);
    this.addSql(`
      create policy content_pages_platform_all on "content_pages"
        for all
        using (app.is_platform_scope())
        with check (app.is_platform_scope());
    `);
    this.addSql(`
      create policy content_pages_public_select on "content_pages"
        for select
        using (status = 'PUBLISHED' and archived_at is null);
    `);

    this.addSql(`alter table "content_page_publications" enable row level security;`);
    this.addSql(`alter table "content_page_publications" force row level security;`);
    this.addSql(`
      create policy content_page_publications_platform_all on "content_page_publications"
        for all
        using (app.is_platform_scope())
        with check (app.is_platform_scope());
    `);
    this.addSql(`
      create policy content_page_publications_public_select on "content_page_publications"
        for select
        using (
          exists (
            select 1 from content_pages p
            where p.id = content_page_publications.page_id
              and p.status = 'PUBLISHED'
              and p.archived_at is null
              and p.current_publication_id = content_page_publications.id
          )
        );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(
      `drop policy if exists content_page_publications_public_select on "content_page_publications";`,
    );
    this.addSql(
      `drop policy if exists content_page_publications_platform_all on "content_page_publications";`,
    );
    this.addSql(`drop policy if exists content_pages_public_select on "content_pages";`);
    this.addSql(`drop policy if exists content_pages_platform_all on "content_pages";`);
    this.addSql(`
      alter table "content_pages"
        drop constraint if exists content_pages_current_publication_fk;
    `);
    this.addSql(`drop table if exists "content_page_publications";`);
    this.addSql(`drop table if exists "content_pages";`);
  }
}
