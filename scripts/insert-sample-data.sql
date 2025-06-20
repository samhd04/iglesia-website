-- Insertar datos de muestra
-- Ejecutar después de crear las tablas

-- Insertar usuarios de muestra (pastores)
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
('Glenis', 'glenis@unlugardeelparati.com', '$2b$10$example_hash_1', 'pastor'),
('Wilmar', 'wilmar@unlugardeelparati.com', '$2b$10$example_hash_2', 'pastor'),
('María Líder', 'maria@unlugardeelparati.com', '$2b$10$example_hash_3', 'lider'),
('Juan Miembro', 'juan@unlugardeelparati.com', '$2b$10$example_hash_4', 'miembro');

-- Insertar eventos de muestra
INSERT INTO eventos (titulo, descripcion, fecha_evento, hora_evento, ubicacion, audiencia, creado_por) VALUES
('Reunión Dominical', 'Únete a nosotros para adoración y enseñanza de la Palabra', '2024-02-04', '10:00:00', 'Lugar principal de reunión', 'todos', (SELECT id FROM usuarios WHERE email = 'glenis@unlugardeelparati.com')),
('Estudio Bíblico', 'Estudio profundo de la Palabra de Dios', '2024-02-07', '19:00:00', 'Casa de oración', 'todos', (SELECT id FROM usuarios WHERE email = 'wilmar@unlugardeelparati.com')),
('Reunión de Jóvenes', 'Tiempo especial para los jóvenes de la congregación', '2024-02-09', '18:00:00', 'Centro juvenil', 'jovenes', (SELECT id FROM usuarios WHERE email = 'maria@unlugardeelparati.com'));

-- Insertar preguntas FAQ de muestra
INSERT INTO preguntas_faq (nombre, email, pregunta) VALUES
('Ana García', 'ana@email.com', '¿Cuáles son los horarios de las reuniones?'),
('Carlos López', 'carlos@email.com', '¿Tienen programas para niños?'),
('Sofia Martín', 'sofia@email.com', '¿Cómo puedo involucrarme en el ministerio?');

-- Insertar formularios de asistentes de muestra
INSERT INTO formularios_asistentes (nombre_completo, email, tiene_congregacion, tiene_discipulado, esta_bautizado, peticion_oracion, desea_contacto) VALUES
('Pedro Rodríguez', 'pedro@email.com', false, false, true, 'Oración por mi familia', true),
('Laura Fernández', 'laura@email.com', true, true, true, 'Sabiduría en decisiones importantes', true),
('Miguel Torres', 'miguel@email.com', false, false, false, NULL, false);
