import Foundation
import CoreText
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// 用法：swift tools/make-icons.swift <楷體字型.ttf> <輸出資料夾>
// 產生 icon-A~D 的 SVG 與 512px PNG。目前正式使用的是 C（一點）。
let fontURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outDir = CommandLine.arguments[2]
let descs = CTFontManagerCreateFontDescriptorsFromURL(fontURL as CFURL) as! [CTFontDescriptor]
let font = CTFontCreateWithFontDescriptor(descs[0], 1000, nil)

let Y = "#FFD500", K = "#000000"

func glyph(_ ch: String) -> CGPath {
    var chars = Array(ch.utf16)
    var glyphs = [CGGlyph](repeating: 0, count: chars.count)
    CTFontGetGlyphsForCharacters(font, &chars, &glyphs, chars.count)
    guard glyphs[0] != 0, let p = CTFontCreatePathForGlyph(font, glyphs[0], nil) else { fatalError("no glyph \(ch)") }
    return p
}
// Fit glyph bbox into rect r (y-down canvas). uniform keeps proportions.
func place(_ p: CGPath, in r: CGRect, uniform: Bool = true) -> CGPath {
    let b = p.boundingBoxOfPath
    var sx = r.width / b.width, sy = r.height / b.height
    if uniform { let s = min(sx, sy); sx = s; sy = s }
    var t = CGAffineTransform(a: sx, b: 0, c: 0, d: -sy, tx: r.midX - b.midX * sx, ty: r.midY + b.midY * sy)
    return p.copy(using: &t)!
}
func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, r: CGFloat = 0) -> CGPath {
    CGPath(roundedRect: CGRect(x: x, y: y, width: w, height: h), cornerWidth: r, cornerHeight: r, transform: nil)
}

typealias Layer = (CGPath, String)

func svgD(_ p: CGPath) -> String {
    var s = ""
    func f(_ v: CGFloat) -> String { String(format: "%.1f", v) }
    p.applyWithBlock { e in
        let el = e.pointee, pt = el.points
        switch el.type {
        case .moveToPoint: s += "M\(f(pt[0].x)) \(f(pt[0].y))"
        case .addLineToPoint: s += "L\(f(pt[0].x)) \(f(pt[0].y))"
        case .addQuadCurveToPoint: s += "Q\(f(pt[0].x)) \(f(pt[0].y)) \(f(pt[1].x)) \(f(pt[1].y))"
        case .addCurveToPoint: s += "C\(f(pt[0].x)) \(f(pt[0].y)) \(f(pt[1].x)) \(f(pt[1].y)) \(f(pt[2].x)) \(f(pt[2].y))"
        case .closeSubpath: s += "Z"
        @unknown default: break
        }
    }
    return s
}

func color(_ hex: String) -> CGColor {
    let v = Int(hex.dropFirst(), radix: 16)!
    return CGColor(srgbRed: CGFloat((v >> 16) & 255) / 255, green: CGFloat((v >> 8) & 255) / 255, blue: CGFloat(v & 255) / 255, alpha: 1)
}

func writeSVG(_ layers: [Layer], to path: String) {
    var out = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\">\n"
    out += "<defs><clipPath id=\"c\"><rect width=\"512\" height=\"512\" rx=\"112\"/></clipPath></defs>\n<g clip-path=\"url(#c)\">\n"
    out += "<rect width=\"512\" height=\"512\" fill=\"\(K)\"/>\n"
    for (p, c) in layers { out += "<path fill=\"\(c)\" d=\"\(svgD(p))\"/>\n" }
    out += "</g>\n</svg>\n"
    try! out.write(toFile: path, atomically: true, encoding: .utf8)
}

func writePNG(_ layers: [Layer], size: Int, to path: String) {
    let cs = CGColorSpace(name: CGColorSpace.sRGB)!
    let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    let s = CGFloat(size) / 512
    ctx.translateBy(x: 0, y: CGFloat(size)); ctx.scaleBy(x: s, y: -s)
    ctx.setFillColor(color(K)); ctx.fill(CGRect(x: 0, y: 0, width: 512, height: 512))
    for (p, c) in layers { ctx.addPath(p); ctx.setFillColor(color(c)); ctx.fillPath() }
    let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
    CGImageDestinationFinalize(dest)
}

// ---------- Variants ----------
var variants: [String: [Layer]] = [:]

// A 巨字：「說」大到撐破畫面，只露出一部分
variants["A"] = [(place(glyph("說"), in: CGRect(x: -330, y: -150, width: 980, height: 980)), Y)]

// B 印章：黃色方印，黑字「看我說」，右欄「看」拉長，左欄「我」「說」
do {
    let o: CGFloat = 92, w: CGFloat = 328, pad: CGFloat = 26, gap: CGFloat = 14
    let colW = (w - pad * 2 - gap) / 2
    let x0 = o + pad, x1 = x0 + colW + gap, y0 = o + pad, h = w - pad * 2
    let cellH = (h - gap) / 2
    variants["B"] = [
        (rect(o, o, w, w, r: 14), Y),
        (place(glyph("看"), in: CGRect(x: x1, y: y0, width: colW, height: h), uniform: false), K),
        (place(glyph("我"), in: CGRect(x: x0, y: y0, width: colW, height: cellH), uniform: false), K),
        (place(glyph("說"), in: CGRect(x: x0, y: y0 + cellH + gap, width: colW, height: cellH), uniform: false), K),
    ]
}

// C 一點：一記楷書的點，加一顆小方印
variants["C"] = [
    (place(glyph("、"), in: CGRect(x: 120, y: 96, width: 250, height: 300)), Y),
    (rect(352, 360, 64, 64, r: 6), Y),
    (place(glyph("說"), in: CGRect(x: 360, y: 368, width: 48, height: 48), uniform: false), K),
]

// D 反白：滿版黃，黑色巨大「看」裁切
variants["D"] = [
    (rect(0, 0, 512, 512), Y),
    (place(glyph("看"), in: CGRect(x: -40, y: 20, width: 640, height: 640)), K),
]

try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
for (name, layers) in variants {
    writeSVG(layers, to: "\(outDir)/icon-\(name).svg")
    writePNG(layers, size: 512, to: "\(outDir)/icon-\(name)-512.png")
}
print("ok")
