import { Migration } from '@mikro-orm/migrations';

/**
 * Runtime app role that cannot bypass RLS (Docker POSTGRES_USER is a superuser).
 * Migrations / DDL keep using the owner URL (octopus); app traffic uses octopus_app.
 *
 * Local default password is octopus_app — change in production via ALTER ROLE.
 */
export class Migration20260920120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      do $$
      begin
        if not exists (select 1 from pg_roles where rolname = 'octopus_app') then
          create role octopus_app login password 'octopus_app'
            nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
        else
          alter role octopus_app with login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
        end if;
      end
      $$;
    `);

    this.addSql(`
      do $$
      begin
        execute format('grant connect on database %I to octopus_app', current_database());
      end
      $$;
    `);
    this.addSql(`grant usage on schema public to octopus_app;`);
    this.addSql(`grant usage on schema app to octopus_app;`);
    this.addSql(`
      grant select, insert, update, delete on all tables in schema public to octopus_app;
    `);
    this.addSql(`grant usage, select on all sequences in schema public to octopus_app;`);
    this.addSql(`grant execute on all functions in schema app to octopus_app;`);

    // Tables created later by the owner role (migrations) inherit grants.
    this.addSql(`
      alter default privileges in schema public
        grant select, insert, update, delete on tables to octopus_app;
    `);
    this.addSql(`
      alter default privileges in schema public
        grant usage, select on sequences to octopus_app;
    `);
    this.addSql(`
      alter default privileges in schema app
        grant execute on functions to octopus_app;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      alter default privileges in schema public
        revoke select, insert, update, delete on tables from octopus_app;
    `);
    this.addSql(`
      alter default privileges in schema public
        revoke usage, select on sequences from octopus_app;
    `);
    this.addSql(`
      alter default privileges in schema app
        revoke execute on functions from octopus_app;
    `);
    this.addSql(`revoke execute on all functions in schema app from octopus_app;`);
    this.addSql(`revoke usage, select on all sequences in schema public from octopus_app;`);
    this.addSql(`
      revoke select, insert, update, delete on all tables in schema public from octopus_app;
    `);
    this.addSql(`revoke usage on schema app from octopus_app;`);
    this.addSql(`revoke usage on schema public from octopus_app;`);
    this.addSql(`
      do $$
      begin
        execute format('revoke connect on database %I from octopus_app', current_database());
      end
      $$;
    `);
    this.addSql(`drop role if exists octopus_app;`);
  }
}
