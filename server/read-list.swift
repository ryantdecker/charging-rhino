import Foundation
import Vision
import ImageIO
import CoreGraphics

guard CommandLine.arguments.count > 1 else {
  fputs("Missing image path\n", stderr)
  exit(1)
}

let url = URL(fileURLWithPath: CommandLine.arguments[1]) as CFURL
guard
  let source = CGImageSourceCreateWithURL(url, [kCGImageSourceShouldCache: true] as CFDictionary),
  let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
else {
  fputs("Could not read that photo.\n", stderr)
  exit(1)
}

let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
let rawOrientation = props?[kCGImagePropertyOrientation] as? UInt32 ?? 1
let orientation = CGImagePropertyOrientation(rawValue: rawOrientation) ?? .up

func recognize(level: VNRequestTextRecognitionLevel, correct: Bool) throws -> [VNRecognizedTextObservation] {
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = level
  request.usesLanguageCorrection = correct
  request.recognitionLanguages = ["en-US"]
  request.minimumTextHeight = 0.008
  let handler = VNImageRequestHandler(cgImage: image, orientation: orientation)
  try handler.perform([request])
  return request.results ?? []
}

var observations: [VNRecognizedTextObservation] = []
do {
  observations = try recognize(level: .accurate, correct: false)
  if observations.isEmpty {
    observations = try recognize(level: .accurate, correct: true)
  }
  if observations.isEmpty {
    observations = try recognize(level: .fast, correct: false)
  }
} catch {
  fputs("Could not read that photo.\n", stderr)
  exit(1)
}

struct Piece {
  let text: String
  let midY: CGFloat
  let minX: CGFloat
  let height: CGFloat
}

let pieces: [Piece] = observations.compactMap { observation in
  guard let text = observation.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines),
        !text.isEmpty
  else { return nil }
  let box = observation.boundingBox
  return Piece(text: text, midY: box.midY, minX: box.minX, height: box.height)
}.sorted { left, right in
  let slack = max(0.012, max(left.height, right.height) * 0.55)
  if abs(left.midY - right.midY) < slack { return left.minX < right.minX }
  return left.midY > right.midY
}

var lines: [String] = []
var anchorY: CGFloat = -1
var anchorH: CGFloat = 0

for piece in pieces {
  let slack = max(0.012, max(anchorH, piece.height) * 0.55)
  if anchorY >= 0 && abs(piece.midY - anchorY) < slack {
    lines[lines.count - 1] += " \(piece.text)"
    anchorY = (anchorY + piece.midY) / 2
    anchorH = max(anchorH, piece.height)
  } else {
    lines.append(piece.text)
    anchorY = piece.midY
    anchorH = piece.height
  }
}

for line in lines {
  print(line)
}
