/**
 * ECC Daemon — SQLite database management.
 */
import Database from 'better-sqlite3'
import { getConfig } from './config.js'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  const config = getConfig()
  const dbPath = config.DATABASE_PATH

  const dir = dirname(dbPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  runMigrations(_db)
  return _db
}

export function closeDb(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const applied = new Set(
    db.prepare('SELECT name FROM migrations').all()
      .map((r: any) => r.name)
  )

  for (const migration of migrations) {
    if (!applied.has(migration.name)) {
      db.exec(migration.sql)
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name)
      console.log(`[DB] Applied migration: ${migration.name}`)
    }
  }
}

const migrations: Array<{ name: string; sql: string }> = [
  {
    name: '001_initial',
    sql: `
      CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id), title TEXT DEFAULT 'New Conversation', agent_id TEXT, skill_id TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), role TEXT NOT NULL CHECK(role IN ('user','assistant','system')), content TEXT NOT NULL, agent_id TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY, conversation_id TEXT REFERENCES conversations(id), run_id TEXT, path TEXT NOT NULL, type TEXT DEFAULT 'html', metadata TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS skills (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, path TEXT NOT NULL, description TEXT, mode TEXT, scenario TEXT, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS plugins (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, path TEXT NOT NULL, version TEXT, trust_level TEXT DEFAULT 'restricted', enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS agent_routing_rules (id TEXT PRIMARY KEY, from_agent_id TEXT NOT NULL, to_agent_ids TEXT NOT NULL, task_type TEXT NOT NULL, priority INTEGER DEFAULT 50, condition TEXT, created_at TEXT DEFAULT (datetime('now')));
    `,
  },
  {
    name: '002_ecommerce',
    sql: `
      CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('pod','dropshipping','digital')), status TEXT DEFAULT 'idea' CHECK(status IN ('draft','idea','researching','in_design','ready_for_launch','active','archived','discontinued')), description TEXT, sku TEXT, price REAL, cost REAL, shipping_cost REAL, supplier_id TEXT, supplier_name TEXT, category TEXT, tags TEXT, weight REAL, is_personalized INTEGER DEFAULT 0, processing_time_days INTEGER DEFAULT 3, metadata TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, product_id TEXT, product_name TEXT, sku TEXT, quantity INTEGER DEFAULT 1, unit_price REAL, total REAL, status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','shipped','delivered','cancelled','returned','refunded')), customer_email TEXT, customer_name TEXT, shipping_address TEXT, tracking_number TEXT, carrier TEXT, is_personalized INTEGER DEFAULT 0, personalization_data TEXT, personalization_preview_url TEXT, production_file_url TEXT, production_vendor TEXT, notes TEXT, refund_amount REAL, refund_reason TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, platform TEXT NOT NULL, status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','paused','completed','archived')), budget REAL, product_ids TEXT, ad_creative_path TEXT, metrics TEXT, launch_date TEXT, objective TEXT, target_audience TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, name TEXT NOT NULL, platform TEXT NOT NULL CHECK(platform IN ('printful','printify','aliexpress','custom')), api_key TEXT, api_url TEXT, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, email TEXT, name TEXT, channel TEXT, total_orders INTEGER DEFAULT 0, total_spent REAL DEFAULT 0, first_order_at TEXT, last_order_at TEXT, tags TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')));
    `,
  },
  {
    name: '003_sop_forms',
    sql: `
      CREATE TABLE IF NOT EXISTS product_research_sheets (id TEXT PRIMARY KEY, product_name TEXT NOT NULL, niche TEXT, target_customer TEXT, occasion TEXT, first_test_channel TEXT, main_competitors TEXT, keywords TEXT, price_proposed REAL, cogs_estimated REAL, shipping_estimated REAL, platform_fees_estimated REAL, cpa_target REAL, margin_target REAL, ip_risks TEXT, fulfillment_risks TEXT, content_angles TEXT, score INTEGER, conclusion TEXT, proposer TEXT, approver TEXT, status TEXT DEFAULT 'draft', created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS creative_briefs (id TEXT PRIMARY KEY, product_name TEXT NOT NULL, product_code TEXT, customer_persona TEXT, gift_recipient TEXT, occasion TEXT, emotion TEXT, main_message TEXT, visual_style TEXT, colors TEXT, prohibited_content TEXT, personalization_requirements TEXT, file_dimensions TEXT, channels TEXT, deadline TEXT, owner TEXT, status TEXT DEFAULT 'draft' CHECK(status IN ('draft','in_review','approved','completed')), created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS ad_test_logs (id TEXT PRIMARY KEY, product_id TEXT, ad_channel TEXT NOT NULL, campaign_id TEXT, creative_id TEXT, angle TEXT, spend REAL DEFAULT 0, impressions INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0, ctr REAL, cpc REAL, add_to_cart INTEGER, purchases INTEGER, cpa REAL, roas REAL, key_comments TEXT, conclusion TEXT, next_action TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS refund_logs (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, channel TEXT NOT NULL, sku TEXT, reason TEXT NOT NULL, fault TEXT, amount REAL NOT NULL, resolution TEXT, handler TEXT, status TEXT DEFAULT 'open' CHECK(status IN ('open','processed','disputed','closed')), prevention_lesson TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS ip_check_logs (id TEXT PRIMARY KEY, product_id TEXT, keywords_checked TEXT, assets_checked TEXT, asset_source TEXT, license TEXT, trademark_risk TEXT CHECK(trademark_risk IN ('low','medium','high','critical')), copyright_risk TEXT CHECK(copyright_risk IN ('low','medium','high','critical')), character_risk TEXT CHECK(character_risk IN ('low','medium','high','critical')), conclusion TEXT, checker TEXT, approver TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS incident_logs (id TEXT PRIMARY KEY, platform TEXT NOT NULL, incident_type TEXT NOT NULL, severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')), description TEXT NOT NULL, evidence_url TEXT, assumed_cause TEXT, owner TEXT, immediate_action TEXT, preventive_action TEXT, status TEXT DEFAULT 'open' CHECK(status IN ('open','investigating','resolved','closed')), created_at TEXT DEFAULT (datetime('now')), closed_at TEXT);
      CREATE TABLE IF NOT EXISTS launch_checklist (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, item_key TEXT NOT NULL, item_name TEXT NOT NULL, completed INTEGER DEFAULT 0, completed_at TEXT, completed_by TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS product_lifecycle (id TEXT PRIMARY KEY, product_id TEXT NOT NULL UNIQUE, state TEXT DEFAULT 'idea' CHECK(state IN ('idea','researching','in_design','ready_for_launch','launching','testing','scaling','mature','discontinued')), checkpoint_3day TEXT, checkpoint_7day TEXT, checkpoint_14day TEXT, checkpoint_30day TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS listing_logs (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, channel TEXT NOT NULL, listing_url TEXT, title TEXT, published_at TEXT, status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','optimizing','paused','removed')), optimization_notes TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS channel_launch_logs (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, channel TEXT NOT NULL, launched_at TEXT, owner TEXT, checklist_complete INTEGER DEFAULT 0, notes TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS order_issue_logs (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, issue_type TEXT NOT NULL, severity TEXT DEFAULT 'medium' CHECK(severity IN ('low','medium','high','critical')), description TEXT, resolved_at TEXT, resolution TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS vendor_scorecards (id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL, period TEXT NOT NULL, on_time_delivery REAL, defect_rate REAL, response_time_hours REAL, actual_cost REAL, peak_capacity_score REAL, tracking_error_rate REAL, complaint_rate REAL, inventory_stability REAL, overall_score REAL, notes TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS etsy_listings (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, tags TEXT, price REAL NOT NULL, quantity INTEGER DEFAULT 1, processing_time_days INTEGER DEFAULT 3, status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending_review','published','optimizing','paused','removed')), etsy_listing_id TEXT, url TEXT, views INTEGER DEFAULT 0, favorites INTEGER DEFAULT 0, orders INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS etsy_dispute_logs (id TEXT PRIMARY KEY, listing_id TEXT, order_id TEXT, dispute_type TEXT NOT NULL, description TEXT, resolution TEXT, status TEXT DEFAULT 'open' CHECK(status IN ('open','resolved','lost','appealed')), created_at TEXT DEFAULT (datetime('now')), closed_at TEXT);
      CREATE TABLE IF NOT EXISTS shopify_products (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, shopify_product_id TEXT, title TEXT NOT NULL, description_html TEXT, vendor TEXT, product_type TEXT, tags TEXT, status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','archived')), seo_title TEXT, seo_description TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS cro_logs (id TEXT PRIMARY KEY, shopify_product_id TEXT, hypothesis TEXT NOT NULL, change_description TEXT, start_date TEXT, end_date TEXT, conversion_before REAL, conversion_after REAL, result TEXT CHECK(result IN ('win','loss','inconclusive','running')), traffic REAL, owner TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS amazon_listings (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, asin TEXT, sku TEXT, title TEXT NOT NULL, bullets TEXT, description TEXT, price REAL, fulfillment_type TEXT DEFAULT 'fbm' CHECK(fulfillment_type IN ('fbm','fba')), status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','blocked','removed')), account_health TEXT, odr REAL, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS qc_logs (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, checked_by TEXT, sku_ok INTEGER, personalization_ok INTEGER, color_size_ok INTEGER, surface_ok INTEGER, packaging_ok INTEGER, photo_url TEXT, result TEXT NOT NULL CHECK(result IN ('pass','fail','conditional')), notes TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, channel TEXT NOT NULL, customer_id TEXT, order_id TEXT, ticket_type TEXT NOT NULL, content TEXT NOT NULL, status TEXT DEFAULT 'open' CHECK(status IN ('open','waiting_customer','escalated','resolved','closed')), sla_deadline TEXT, assigned_to TEXT, macro_used TEXT, resolution TEXT, csat INTEGER, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS daily_reconciliation (id TEXT PRIMARY KEY, date TEXT NOT NULL, channel TEXT NOT NULL, revenue REAL DEFAULT 0, platform_fees REAL DEFAULT 0, ad_spend REAL DEFAULT 0, refunds REAL DEFAULT 0, net_revenue REAL DEFAULT 0, notes TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS sla_events (id TEXT PRIMARY KEY, process_name TEXT NOT NULL, object_id TEXT, sla_hours REAL NOT NULL, breached_at TEXT, severity TEXT CHECK(severity IN ('warning','breach','critical')), status TEXT DEFAULT 'active' CHECK(status IN ('active','acknowledged','resolved')), created_at TEXT DEFAULT (datetime('now')));
    `,
  },
  {
    name: '004_shopify_columns',
    sql: `
      ALTER TABLE shopify_products ADD COLUMN price REAL;
      ALTER TABLE shopify_products ADD COLUMN compare_at_price REAL;
      ALTER TABLE shopify_products ADD COLUMN sku TEXT;
      ALTER TABLE shopify_products ADD COLUMN inventory_qty INTEGER DEFAULT 0;
      ALTER TABLE shopify_products ADD COLUMN is_personalized INTEGER DEFAULT 0;
      ALTER TABLE shopify_products ADD COLUMN personalization_fields TEXT;
    `,
  },
  {
    name: '005_amazon_columns',
    sql: `
      ALTER TABLE amazon_listings ADD COLUMN category TEXT;
      ALTER TABLE amazon_listings ADD COLUMN variation_theme TEXT;
      ALTER TABLE amazon_listings ADD COLUMN parent_asin TEXT;
    `,
  },
  {
    name: '006_amazon_account_health',
    sql: `
      CREATE TABLE IF NOT EXISTS amazon_account_health (
        id TEXT PRIMARY KEY,
        odr REAL DEFAULT 0,
        cancellation_rate REAL DEFAULT 0,
        late_shipment_rate REAL DEFAULT 0,
        valid_tracking_rate REAL DEFAULT 1,
        overall_health TEXT DEFAULT 'good' CHECK(overall_health IN ('good','at_risk','critical')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS amazon_account_incidents (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('policy_violation','customer_complaint','intellectual_property','safety_concern','performance')),
        severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
        description TEXT NOT NULL,
        category TEXT,
        reported_at TEXT NOT NULL,
        status TEXT DEFAULT 'open' CHECK(status IN ('open','investigating','resolved')),
        resolution TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `,
  },
  {
    name: '007_amazon_campaigns',
    sql: `
      CREATE TABLE IF NOT EXISTS amazon_campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        listing_id TEXT NOT NULL,
        daily_budget REAL NOT NULL,
        start_date TEXT NOT NULL,
        campaign_type TEXT NOT NULL CHECK(campaign_type IN ('sponsored_products','sponsored_brands','sponsored_display')),
        targeting_type TEXT NOT NULL CHECK(targeting_type IN ('auto','manual','auto_plus_manual')),
        bid_strategy TEXT NOT NULL CHECK(bid_strategy IN ('dynamic_down_only','dynamic_up_down','fixed')),
        default_bid REAL NOT NULL,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft','running','paused','archived')),
        keywords TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS amazon_campaign_performance (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL REFERENCES amazon_campaigns(id),
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        spend REAL DEFAULT 0,
        sales REAL DEFAULT 0,
        orders INTEGER DEFAULT 0,
        acos REAL DEFAULT 0,
        tacos REAL DEFAULT 0,
        ctr REAL DEFAULT 0,
        conversion_rate REAL DEFAULT 0,
        roas REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `,
  },
  {
    name: '008_support',
    sql: `
      ALTER TABLE support_tickets ADD COLUMN customer_email TEXT;
      ALTER TABLE support_tickets ADD COLUMN customer_name TEXT;
      ALTER TABLE support_tickets ADD COLUMN first_response_at TEXT;
      ALTER TABLE support_tickets ADD COLUMN resolved_at TEXT;

      CREATE TABLE IF NOT EXISTS ticket_responses (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL REFERENCES support_tickets(id),
        response TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Update refund_logs CHECK constraint to support Phase 8 workflow
      PRAGMA foreign_keys=off;
      CREATE TABLE IF NOT EXISTS refund_logs_new (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        sku TEXT,
        reason TEXT NOT NULL,
        fault TEXT,
        amount REAL NOT NULL,
        resolution TEXT,
        handler TEXT,
        status TEXT DEFAULT 'pending_approval' CHECK(status IN ('pending_approval','approved','processed','disputed','closed')),
        prevention_lesson TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO refund_logs_new SELECT * FROM refund_logs;
      DROP TABLE IF EXISTS refund_logs;
      ALTER TABLE refund_logs_new RENAME TO refund_logs;
      PRAGMA foreign_keys=on;
    `,
  },
  {
    name: '009_fulfillment',
    sql: `
      CREATE TABLE IF NOT EXISTS fulfillment_orders (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','in_production','quality_check','packing','shipped','delivered','returned')),
        sku TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        is_personalized INTEGER DEFAULT 0,
        personalization_data TEXT,
        personalization_preview_url TEXT,
        production_file_url TEXT,
        vendor_id TEXT,
        assigned_to TEXT,
        tracking_number TEXT,
        carrier TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      ALTER TABLE qc_logs ADD COLUMN fulfillment_order_id TEXT;
    `,
  },
  {
    name: '010_finance',
    sql: `
      ALTER TABLE daily_reconciliation ADD COLUMN orders_count INTEGER DEFAULT 0;
      ALTER TABLE daily_reconciliation ADD COLUMN refund_count INTEGER DEFAULT 0;

      CREATE TABLE IF NOT EXISTS pnl_by_sku (
        id TEXT PRIMARY KEY,
        sku TEXT NOT NULL,
        product_id TEXT NOT NULL,
        period TEXT NOT NULL,
        avg_price REAL DEFAULT 0,
        cogs REAL DEFAULT 0,
        shipping REAL DEFAULT 0,
        platform_fees REAL DEFAULT 0,
        payment_fees REAL DEFAULT 0,
        ads_allocated REAL DEFAULT 0,
        refunds_allocated REAL DEFAULT 0,
        gross_margin REAL DEFAULT 0,
        contribution_margin REAL DEFAULT 0,
        classification TEXT NOT NULL DEFAULT 'optimize' CHECK(classification IN ('scale','keep','optimize','stop')),
        units_sold INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS finance_alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('cpa_spike','refund_spike','negative_margin','payment_hold','cashflow_warning')),
        severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
        message TEXT NOT NULL,
        channel TEXT,
        value REAL,
        created_at TEXT DEFAULT (datetime('now')),
        acknowledged INTEGER DEFAULT 0
      );
    `,
  },
  {
    name: '011_product_research_ip',
    sql: `
      CREATE TABLE IF NOT EXISTS competitor_entries (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        competitor_name TEXT NOT NULL,
        price REAL DEFAULT 0,
        reviews INTEGER DEFAULT 0,
        rating REAL DEFAULT 0,
        main_image_url TEXT,
        offer TEXT,
        shipping_time TEXT,
        key_message TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS ip_blacklist (
        id TEXT PRIMARY KEY,
        keyword TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK(type IN ('brand','character','sports_team','university','movie','song','quote','celebrity')),
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `,
  },
  {
    name: '012_phases_9_10',
    sql: `
      -- Phase 9: Product Launch Orchestration
      CREATE TABLE IF NOT EXISTS launch_orchestrations (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        stage TEXT NOT NULL DEFAULT 'research' CHECK(stage IN ('research','creative','launch','data','scale')),
        status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed','blocked')),
        etsy_launched INTEGER DEFAULT 0,
        shopify_launched INTEGER DEFAULT 0,
        amazon_ready INTEGER DEFAULT 0,
        ad_campaign_active INTEGER DEFAULT 0,
        social_content_posted INTEGER DEFAULT 0,
        fulfillment_ready INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      -- Add product_id index for fast lookups
      CREATE INDEX IF NOT EXISTS idx_launch_orch_product ON launch_orchestrations(product_id);

      -- Phase 10: Dashboard + BI tables already exist in 003_sop_forms:
      -- listing_logs, channel_launch_logs, order_issue_logs, ad_test_logs, creative_briefs,
      -- incident_logs, ip_check_logs, sla_events, product_lifecycle, launch_checklist
      -- All were created in migration 003; no new tables needed.
    `,
  },
]
