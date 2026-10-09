# SERVICRUZ

Directorio de técnicos de Santa Cruz de la Sierra: plomeros, electricistas, técnicos de aire acondicionado y más, ordenados por cercanía y con contacto directo por WhatsApp.

- **`index.html`**: la web que ven los clientes. Solo muestra negocios **inscritos**, del más cercano al más lejano. Usa la ubicación del teléfono o el barrio que elija el cliente. Incluye el formulario "Soy técnico".
- **`panel.html`**: tu panel de llamadas. Mapa de anillos, estados (por llamar, no contesta, interesado, inscrito), notas, agregar y quitar negocios, solicitudes nuevas y exportar a CSV.
- Se instala en el teléfono como app (PWA).

Sin configurar nada, la web funciona en **modo demo** con 100 negocios de ejemplo (sin teléfono). Los pasos de abajo la conectan a una base de datos real.

## Puesta en marcha

### 1. Crear la base de datos (Supabase, gratis)
1. Crea una cuenta en supabase.com y un proyecto nuevo (región: São Paulo es la más cercana a Bolivia).
2. Abre **SQL Editor**, pega el contenido de `supabase/schema.sql` y pulsa **Run**.
3. En el mismo SQL Editor, agrega tu correo como administrador:
   ```sql
   insert into public.admins (email) values ('TU_CORREO@gmail.com');
   ```
4. Opcional: pega `supabase/seed.sql` y pulsa **Run** para cargar los 100 negocios de ejemplo.
5. En **Authentication → Users → Add user**, crea tu usuario con ese mismo correo y una contraseña. Con esos datos entras al panel.

### 2. Conectar la web a la base de datos
En Supabase, **Project Settings → API**, copia la **Project URL** y la **anon public key** y pégalas en `assets/js/config.js`. La anon key es pública por diseño; la seguridad la dan las reglas de `schema.sql`:
- El público solo puede leer negocios **inscritos** y enviar solicitudes.
- Solo los correos de la tabla `admins` pueden ver y editar todo.

### 3. Publicar (Netlify, gratis)
1. En netlify.com: **Add new site → Import an existing project → GitHub** y elige este repositorio.
2. No hace falta comando de compilación; Netlify usa `netlify.toml`.
3. Cada cambio que se suba a GitHub se publica solo. Luego puedes conectar tu propio dominio.

### 4. Instalar en el teléfono
Abre la web en el teléfono. En Android, Chrome ofrece **Instalar app**; en iPhone, Safari → Compartir → **Añadir a pantalla de inicio**.

## Estructura
```
index.html            Web de clientes
panel.html            Panel de llamadas
assets/css/styles.css Estilos
assets/js/config.js   Claves de Supabase (vacías = modo demo)
assets/js/common.js   Anillos, barrios, distancias, mapa y datos
assets/js/app.js      Lógica de la web de clientes
assets/js/panel.js    Lógica del panel
data/demo.json        100 negocios de ejemplo
supabase/schema.sql   Tablas y reglas de seguridad
supabase/seed.sql     Negocios de ejemplo para la base real
manifest.webmanifest, sw.js, assets/icons/  App instalable
```

## Notas
- Los anillos se dibujan como círculos aproximados alrededor de la Plaza 24 de Septiembre, y las distancias son en línea recta.
- Los negocios de ejemplo no tienen teléfono a propósito, para no llamar a números de desconocidos. Bórralos cuando tengas los reales: `delete from public.negocios where simulado = true;`
