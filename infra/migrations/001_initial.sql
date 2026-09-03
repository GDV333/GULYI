-- Enums
CREATE TYPE user_role        AS ENUM ('client', 'vendor', 'admin');
CREATE TYPE vendor_category  AS ENUM ('venue','dj','host','photo','video','catering','decor','artist','confectionery');
CREATE TYPE booking_status   AS ENUM ('pending','confirmed','paid','completed','cancelled','refunded');
CREATE TYPE payment_status   AS ENUM ('awaiting','held','released','refunded','failed');

-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  avatar        TEXT,
  role          user_role NOT NULL DEFAULT 'client',
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_email_idx ON users(email);

-- Vendor profiles
CREATE TABLE vendor_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category      vendor_category NOT NULL,
  slug          VARCHAR(120) NOT NULL UNIQUE,
  bio           TEXT,
  city          VARCHAR(80) NOT NULL,
  price_from    INTEGER,
  price_unit    VARCHAR(40),
  rating        DECIMAL(3,2) DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  tags          JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX vp_user_idx     ON vendor_profiles(user_id);
CREATE INDEX vp_city_idx     ON vendor_profiles(city);
CREATE INDEX vp_category_idx ON vendor_profiles(category);
CREATE INDEX vp_rating_idx   ON vendor_profiles(rating DESC);

-- Media
CREATE TABLE media (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  type       VARCHAR(10) NOT NULL DEFAULT 'image',
  "order"    INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Services
CREATE TABLE services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  title       VARCHAR(120) NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL,
  price_unit  VARCHAR(40) NOT NULL,
  duration    INTEGER,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES users(id),
  vendor_id  UUID NOT NULL REFERENCES users(id),
  profile_id UUID NOT NULL REFERENCES vendor_profiles(id),
  service_id UUID REFERENCES services(id),
  event_date TIMESTAMPTZ NOT NULL,
  total      INTEGER NOT NULL,
  status     booking_status NOT NULL DEFAULT 'pending',
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX bookings_client_idx ON bookings(client_id);
CREATE INDEX bookings_vendor_idx ON bookings(vendor_id);
CREATE INDEX bookings_status_idx ON bookings(status);

-- Payments
CREATE TABLE payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id),
  amount       INTEGER NOT NULL,
  commission   INTEGER NOT NULL,
  status       payment_status NOT NULL DEFAULT 'awaiting',
  external_id  VARCHAR(100),
  held_until   TIMESTAMPTZ,
  released_at  TIMESTAMPTZ,
  refunded_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id),
  author_id  UUID NOT NULL REFERENCES users(id),
  profile_id UUID NOT NULL REFERENCES vendor_profiles(id),
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX reviews_profile_idx ON reviews(profile_id);

-- Chats
CREATE TABLE chats (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES users(id),
  vendor_id  UUID NOT NULL REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES users(id),
  text       TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX messages_chat_idx ON messages(chat_id);

-- Promotions
CREATE TABLE promotions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES vendor_profiles(id),
  plan       VARCHAR(20) NOT NULL,
  starts_at  TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Функция auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at         BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER vendor_profiles_updated  BEFORE UPDATE ON vendor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bookings_updated_at      BEFORE UPDATE ON bookings       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
