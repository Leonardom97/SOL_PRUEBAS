-- Database Schema for Vansolix Weighing System
-- Database: vscalex_oleaginosas
-- Server: 192.168.0.199

-- =============================================
-- Configuration Tables
-- =============================================

-- Table: admin_usuarios
-- User accounts for weighing system
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_usuarios')
BEGIN
    CREATE TABLE admin_usuarios (
        codigo INT IDENTITY(1,1) PRIMARY KEY,
        nombres NVARCHAR(100) NOT NULL,
        apellidos NVARCHAR(100) NOT NULL,
        usuario NVARCHAR(50) NOT NULL UNIQUE,
        password VARBINARY(256) NOT NULL, -- Encrypted with PWDENCRYPT
        tr_codigo INT NOT NULL, -- Role ID
        est_codigo INT NOT NULL DEFAULT 1, -- Status ID
        CONSTRAINT FK_admin_usuarios_rol FOREIGN KEY (tr_codigo) REFERENCES tipos_roles(codigo),
        CONSTRAINT FK_admin_usuarios_estado FOREIGN KEY (est_codigo) REFERENCES tipos_estados(codigo)
    );
END
GO

-- Table: tipos_roles
-- User roles
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipos_roles')
BEGIN
    CREATE TABLE tipos_roles (
        codigo INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(50) NOT NULL,
        est_codigo INT NOT NULL DEFAULT 1
    );
    
    -- Insert default roles
    INSERT INTO tipos_roles (nombre, est_codigo) VALUES 
        ('Administrador', 1),
        ('Operador', 1),
        ('Supervisor', 1);
END
GO

-- Table: tipos_estados
-- Status types
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipos_estados')
BEGIN
    CREATE TABLE tipos_estados (
        codigo INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(50) NOT NULL,
        est_codigo INT NOT NULL DEFAULT 1
    );
    
    -- Insert default states
    INSERT INTO tipos_estados (nombre, est_codigo) VALUES 
        ('Activo', 1),
        ('Completado', 1),
        ('Cancelado', 1),
        ('Inactivo', 1);
END
GO

-- Table: admin_terminales
-- Scale terminal configuration
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_terminales')
BEGIN
    CREATE TABLE admin_terminales (
        codigo INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(100) NOT NULL,
        com NVARCHAR(20), -- COM port (for serial connection)
        velocidadTransmision NVARCHAR(20), -- Baud rate
        paridad NVARCHAR(20), -- Parity
        bitsdatos INT, -- Data bits
        bitsparada INT, -- Stop bits
        ip NVARCHAR(50), -- IP address (for TCP/IP connection)
        puerto INT, -- Port number
        observaciones NVARCHAR(500),
        conx_predeterminada NVARCHAR(20), -- Connection type: 'IP' or 'COM'
        est_codigo INT NOT NULL DEFAULT 1
    );
    
    -- Insert default configuration for IP-based scale
    INSERT INTO admin_terminales (nombre, ip, puerto, conx_predeterminada, est_codigo)
    VALUES ('Bascula Principal', '192.168.0.35', 4001, 'IP', 1);
END
GO

-- Table: tipos_productos
-- Product types
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipos_productos')
BEGIN
    CREATE TABLE tipos_productos (
        codigo INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(100) NOT NULL,
        sap_codigo NVARCHAR(50), -- SAP product code
        est_codigo INT NOT NULL DEFAULT 1
    );
END
GO

-- Table: tipos_transaccion
-- Transaction types
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipos_transaccion')
BEGIN
    CREATE TABLE tipos_transaccion (
        codigo INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(100) NOT NULL,
        est_codigo INT NOT NULL DEFAULT 1
    );
    
    -- Insert default transaction types
    INSERT INTO tipos_transaccion (nombre, est_codigo) VALUES 
        ('Compra', 1),
        ('Venta', 1),
        ('Orden de Produccion', 1);
END
GO

-- Table: doc_origen
-- Document origin types
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'doc_origen')
BEGIN
    CREATE TABLE doc_origen (
        codigo INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(100) NOT NULL,
        est_codigo INT NOT NULL DEFAULT 1
    );
    
    -- Insert default document origins
    INSERT INTO doc_origen (nombre, est_codigo) VALUES 
        ('Orden de Compra', 1),
        ('Orden de Venta', 1),
        ('Orden de Produccion', 1),
        ('Remision', 1);
END
GO

-- Table: admin_destino
-- Destinations
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_destino')
BEGIN
    CREATE TABLE admin_destino (
        codigo INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(100) NOT NULL
    );
END
GO

-- Table: admin_procedencia
-- Origins/Sources
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_procedencia')
BEGIN
    CREATE TABLE admin_procedencia (
        codigo INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(100) NOT NULL
    );
END
GO

-- Table: admin_vehiculos
-- Local vehicle registry (backup/complement to SAP)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_vehiculos')
BEGIN
    CREATE TABLE admin_vehiculos (
        codigo INT IDENTITY(1,1) PRIMARY KEY,
        placa NVARCHAR(20) NOT NULL,
        conductor NVARCHAR(200),
        tara INT, -- Tare weight in kg
        observaciones NVARCHAR(500),
        est_codigo INT NOT NULL DEFAULT 1
    );
END
GO

-- Table: informacion_recibo
-- Receipt printing information
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'informacion_recibo')
BEGIN
    CREATE TABLE informacion_recibo (
        codigo INT IDENTITY(1,1) PRIMARY KEY,
        nombre_empresa NVARCHAR(200),
        nit_empresa NVARCHAR(50),
        titulo_recibo NVARCHAR(200)
    );
    
    -- Insert default record
    INSERT INTO informacion_recibo (nombre_empresa, nit_empresa, titulo_recibo)
    VALUES ('OSM - Oleaginosas San Marcos', '900123456-1', 'RECIBO DE PESAJE');
END
GO

-- =============================================
-- Transaction Tables
-- =============================================

-- Table: trans_pesadas
-- Main weighing transactions table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'trans_pesadas')
BEGIN
    CREATE TABLE trans_pesadas (
        codigo INT IDENTITY(1,1) PRIMARY KEY,
        fecha_entrada DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_salida DATETIME,
        placa NVARCHAR(20) NOT NULL,
        conductor NVARCHAR(200),
        siembra NVARCHAR(50), -- Planting/cultivation code
        tt_codigo INT NOT NULL, -- Transaction type ID
        tp_codigo NVARCHAR(50), -- Product SAP code
        tpr_codigo NVARCHAR(50), -- Origin/source code (from SAP)
        do_codigo INT, -- Document origin type ID
        num_documento NVARCHAR(50), -- Document number
        peso_bruto INT DEFAULT 0, -- Gross weight in kg
        peso_tara INT DEFAULT 0, -- Tare weight in kg
        peso_neto INT DEFAULT 0, -- Net weight in kg
        au_codigo INT NOT NULL, -- User ID who registered
        est_codigo INT NOT NULL DEFAULT 1, -- Status: 1=Active/Entry, 2=Completed/Exit
        CONSTRAINT FK_trans_pesadas_transaccion FOREIGN KEY (tt_codigo) REFERENCES tipos_transaccion(codigo),
        CONSTRAINT FK_trans_pesadas_doc_origen FOREIGN KEY (do_codigo) REFERENCES doc_origen(codigo),
        CONSTRAINT FK_trans_pesadas_usuario FOREIGN KEY (au_codigo) REFERENCES admin_usuarios(codigo),
        CONSTRAINT FK_trans_pesadas_estado FOREIGN KEY (est_codigo) REFERENCES tipos_estados(codigo)
    );
    
    -- Create indexes for better performance
    CREATE INDEX IX_trans_pesadas_placa ON trans_pesadas(placa);
    CREATE INDEX IX_trans_pesadas_fecha_entrada ON trans_pesadas(fecha_entrada);
    CREATE INDEX IX_trans_pesadas_fecha_salida ON trans_pesadas(fecha_salida);
    CREATE INDEX IX_trans_pesadas_estado ON trans_pesadas(est_codigo);
END
GO

-- =============================================
-- SAP Integration
-- =============================================
-- Note: The following tables are read from SAP_OLEAGINOSAS database
-- They are not created in vscalex_oleaginosas, only queried
/*
SAP_OLEAGINOSAS.dbo.[@VEHICULOS] - Vehicles with tare and driver
    Fields: DocEntry, U_Vehiculo (plate), U_Procedencia (location), U_Tara (tare), U_Conductor (driver)

SAP_OLEAGINOSAS.dbo.[OCRD] - Business Partners (clients and suppliers)
    Fields: CardCode, CardName, CardType ('C'=Client, 'S'=Supplier)

SAP_OLEAGINOSAS.dbo.[OPRC] - Cost Centers and Plantings
    Fields: PrcCode, PrcName, DimCode ('1'=Cost Center, '2'=Planting), Active

SAP_OLEAGINOSAS.dbo.[OWOR] - Production Orders
    Fields: DocNum, Status, OcrCode (cost center), OcrCode2 (planting)

SAP_OLEAGINOSAS.dbo.[ORDR] - Sales Orders
    Fields: DocNum, DocStatus, CardCode

SAP_OLEAGINOSAS.dbo.[OPOR] - Purchase Orders
    Fields: DocNum, DocStatus, CardCode
*/

-- =============================================
-- Sample Queries
-- =============================================

-- Get active weighings (entries without exit)
-- SELECT * FROM trans_pesadas WHERE est_codigo = 1;

-- Get completed weighings for today
-- SELECT * FROM trans_pesadas 
-- WHERE CAST(fecha_salida AS DATE) = CAST(GETDATE() AS DATE) 
-- AND est_codigo = 2;

-- Get total weight by product for a date range
-- SELECT tp_codigo, SUM(peso_neto) as total_peso
-- FROM trans_pesadas
-- WHERE fecha_salida BETWEEN '2024-01-01' AND '2024-12-31'
-- AND est_codigo = 2
-- GROUP BY tp_codigo;

-- Get vehicles from SAP by location
-- SELECT DocEntry, U_Vehiculo, U_Conductor, U_Tara
-- FROM SAP_OLEAGINOSAS.dbo.[@VEHICULOS]
-- WHERE U_Procedencia = 'SEMAG';
