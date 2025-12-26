<?php
/**
 * Output Encoder
 * Proporciona funciones de codificación de salida para prevenir XSS
 */

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Acceso prohibido');
}

class OutputEncoder {
    
    /**
     * Codificar para contexto HTML
     * @param string $data
     * @return string
     */
    public static function html($data) {
        if ($data === null) {
            return '';
        }
        return htmlspecialchars($data, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
    
    /**
     * Codificar para atributos HTML
     * @param string $data
     * @return string
     */
    public static function attr($data) {
        if ($data === null) {
            return '';
        }
        return htmlspecialchars($data, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
    
    /**
     * Codificar para JavaScript
     * @param string $data
     * @return string
     */
    public static function js($data) {
        if ($data === null) {
            return '""';
        }
        return json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE);
    }
    
    /**
     * Codificar para JSON
     * @param mixed $data
     * @return string
     */
    public static function json($data) {
        return json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE);
    }
    
    /**
     * Codificar para URLs
     * @param string $data
     * @return string
     */
    public static function url($data) {
        if ($data === null) {
            return '';
        }
        return urlencode($data);
    }
    
    /**
     * Codificar para contexto CSS
     * @param string $data
     * @return string
     */
    public static function css($data) {
        if ($data === null) {
            return '';
        }
        // Eliminar caracteres peligrosos para CSS
        return preg_replace('/[^a-zA-Z0-9\-_#\s]/', '', $data);
    }
    
    /**
     * Limpiar HTML permitiendo solo tags seguros
     * @param string $html
     * @param array $allowedTags Tags permitidos
     * @return string
     */
    public static function cleanHTML($html, $allowedTags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li']) {
        if ($html === null) {
            return '';
        }
        
        // Configurar tags permitidos
        $allowed = '<' . implode('><', $allowedTags) . '>';
        
        // Limpiar HTML
        $clean = strip_tags($html, $allowed);
        
        // Usar DOMDocument para sanitizar atributos
        if (extension_loaded('dom')) {
            $dom = new DOMDocument();
            libxml_use_internal_errors(true);
            $dom->loadHTML('<?xml encoding="UTF-8">' . $clean, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
            libxml_clear_errors();
            
            // Eliminar atributos peligrosos
            $xpath = new DOMXPath($dom);
            $nodes = $xpath->query('//*[@onclick or @onerror or @onload or @onmouseover]');
            foreach ($nodes as $node) {
                $node->removeAttribute('onclick');
                $node->removeAttribute('onerror');
                $node->removeAttribute('onload');
                $node->removeAttribute('onmouseover');
            }
            
            $clean = $dom->saveHTML();
        }
        
        return $clean;
    }
    
    /**
     * Codificar salida de forma inteligente según contexto
     * @param mixed $data
     * @param string $context Contexto: html, attr, js, json, url, css
     * @return string
     */
    public static function encode($data, $context = 'html') {
        switch ($context) {
            case 'html':
                return self::html($data);
            case 'attr':
                return self::attr($data);
            case 'js':
                return self::js($data);
            case 'json':
                return self::json($data);
            case 'url':
                return self::url($data);
            case 'css':
                return self::css($data);
            default:
                return self::html($data);
        }
    }
    
    /**
     * Crear respuesta JSON segura
     * @param array $data
     * @param int $httpCode
     */
    public static function jsonResponse($data, $httpCode = 200) {
        http_response_code($httpCode);
        header('Content-Type: application/json; charset=UTF-8');
        echo self::json($data);
        exit;
    }
}

// Funciones helper globales para facilidad de uso
if (!function_exists('e')) {
    /**
     * Codificar para HTML (alias corto)
     * @param string $data
     * @return string
     */
    function e($data) {
        return OutputEncoder::html($data);
    }
}

if (!function_exists('ejs')) {
    /**
     * Codificar para JavaScript (alias corto)
     * @param string $data
     * @return string
     */
    function ejs($data) {
        return OutputEncoder::js($data);
    }
}

if (!function_exists('eurl')) {
    /**
     * Codificar para URL (alias corto)
     * @param string $data
     * @return string
     */
    function eurl($data) {
        return OutputEncoder::url($data);
    }
}
